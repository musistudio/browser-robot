const Detector = require('./lib/snowboy/').Detector;
const Models = require('./lib/snowboy/').Models;
const { record } = require('node-record-lpcm16');
const io = require('socket.io-client');
const socket = io('http://localhost:3000/');

const models = new Models();

models.add({
  file: 'resources/models/snowboy.umdl',
  sensitivity: '0.6',
  hotwords : 'snowboy'
});

const detector = new Detector({
  resource: "resources/common.res",
  models: models,
  audioGain: 2.0,
  applyFrontend: true
});

// 静默
detector.on('silence', function () {
  socket.emit('snowboy', {cmd: 'silence'});
  console.log('silence');
});

detector.on('sound', function (buffer) {
  console.log('sound');
});

detector.on('error', function () {
  console.log('error');
});

detector.on('hotword', function (index, hotword, buffer) {
  socket.emit('snowboy', {cmd: 'hotword'});
  console.log('hotword', index, hotword);
});


const mic = record({
  sampleRate: 16000,
  threshold: 0.9,
  recorder: 'rec',
}).stream();

mic.pipe(detector);
