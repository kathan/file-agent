"use strict";
var FileAgent = require('../index.js'),
    p = FileAgent(`${__dirname}/in/`, [`${__dirname}/out1/`, `${__dirname}/out2/`], `${__dirname}/failed/`, (eventType, filename, in_folder, out_folders, failed_folder, done)=>{
      var d = new Date()
      done(null, 'out2');
    }, (p, re)=>{
      p.start();
});