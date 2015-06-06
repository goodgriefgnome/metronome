function Metronome() {
  this.bpm = 60;
  this.beepParams = {
    gain: 0.5,
    frequency: 440,
    duration: 0.04,
  };
  
  // A list of modifier functions that operate on a copy of this.beepParams.
  this.beepModifiers = [function(beep) {}];

  this._context = null;
  this._gain = null;
  this._osc = null;
  this._queuedTime = null;
  this._modifierIndex = 0;
}

Metronome.prototype.start = function() {
  if (this._startTime != null) return;

  this._context = new AudioContext();
  this._gain = this._context.createGain();
  this._osc = this._context.createOscillator();
  this._osc.type = 'triangle';
  
  this._osc.connect(this._gain);
  this._gain.connect(this._context.destination);
  
  this._gain.gain.value = 0;
  this._osc.start();
  this._queuedTime = this._context.currentTime;
  this._modifierIndex = -1;
  this._queueEvents();
}

Metronome.prototype.stop = function() {
  this._osc.stop();
  this._gain.gain.cancelScheduledValues(this._context.currentTime);
  this._startTime = null;
  this._gain = null;
  this._osc = null;
  this._context.close();
}

Metronome.prototype._queueEvents = function() {
  if (this._queuedTime == null) return;
  var kTimeoutMs = 100;
  var kMinDuration = 0.1;
  var kMaxBeepDuration = 0.8 * kMinDuration;

  var beatDuration = Math.max(60.0 / this.bpm, kMinDuration);
  var target = this._context.currentTime + 2*kTimeoutMs/1000.0;
  while (this._queuedTime < target) {
    this._queuedTime += beatDuration;
    
    var beep = Object.create(this.beepParams);
    this._modifierIndex = (this._modifierIndex + 1) % this.beepModifiers.length;
    this.beepModifiers[this._modifierIndex](beep);

    this._osc.frequency.setValueAtTime(beep.frequency, this._queuedTime);

    var duration = Math.min(beep.duration, kMaxBeepDuration);
    var tau = duration / 5.0;
    this._gain.gain.setTargetAtTime(beep.gain, this._queuedTime, tau);
    this._gain.gain.setTargetAtTime(0, this._queuedTime + duration, tau);
  }
  
  var that = this;
  window.setTimeout(function() { that._queueEvents(); }, kTimeoutMs);
}
