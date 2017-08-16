"use strict";
var Process = require('../index.js'),
    p = Process(`${__dirname}/in/`, [`${__dirname}/out1/`, `${__dirname}/out2/`], `${__dirname}/failed/`, (eventType, filename, in_folder, out_folders, failed_folder, done)=>{
      var d = new Date()
      //console.log(d.toISOString(),'\t', eventType, '\t',filename, '\t',in_folder, '\t',out_folders, '\t',failed_folder);
      //done('This file sucks!');//fail
      done(null, 'out2');
    }, (p, re)=>{
      //console.log('result', re);
      p.start();
});