"use strict";

const Async = require('async');
const formidable = require('formidable');
const express = require('express');
const fs = require('fs');
const app = express();
const FileAgent = require('../index.js');
const path = require('path');
const sendFile = require('@kathan/send-file');
const port = 4536;
const agent_1_name = 'test-agent1';
const agent_2_name = 'test-agent2';
const agent_3_name = 'test-agent3';

var fa1;
var fa2;
var fa3;
app.set("json spaces", 2);
app.use((req, res, next)=>{
  if (req.method.toLowerCase() == 'post') {
    var form = new formidable.IncomingForm();
    //console.log('Server received post. Parsing files...');
    form.parse(req, function(err, fields, files) {
      if(err){return;}
      req.body = fields;
      //req.files = files;
      var files_obj = {};
      
      for(var i in files){
        files[i].data = fs.readFileSync(files[i].path);
      }
      req.files = files;
      //console.log('Files parsed.');
      next();
    });
    return;
  }
  next();
});

Async.series([
  (next)=>{

    app.listen(port, () => {
      console.log(`app listening on ${port}`);
      next();
    });
    
  },
  (next)=>{
    //app, agent_root, agent_name, dest_endpoint, script, cb)
    fa1 = FileAgent(app, path.resolve(__dirname, 'fa'), agent_1_name, `http://localhost:${port}/${agent_2_name}`, (err)=>{
      if(err){return next(err);}
      console.log(`Running agent ${agent_1_name}`);
      next();
    });
    fa1.on('file', (file, payload, done)=>{
      //console.log('file1', file);
      payload.count++;
      console.log('payload1', payload);
      done(true);
    });
    fa1.on('error', (err)=>{
      console.log('error 1', err);
    });
  },
  (next)=>{
    fa2 = FileAgent(app, path.resolve(__dirname, 'fa'), agent_2_name, `http://localhost:${port}/${agent_1_name}`, (err)=>{
      if(err){return next(err);}
      console.log(`Running agent ${agent_2_name}`);
      next();
    });
    fa2.on('file', (file, payload, done)=>{
      //console.log('file2', file);
      //console.log('payload2', payload);
      done(true);
    });
    fa2.on('error', (err)=>{
      console.log('error 2', err);
    });
  }/*,
  (next)=>{
    fa3 = FileAgent(app, path.resolve(__dirname, 'fa'), agent_3_name, `http://localhost:${port}/${agent_1_name}`, (err)=>{
      if(err){return next(err);}
      console.log(`Running agent ${agent_3_name}`);
      next();
    });
    fa3.on('file', (file, payload, done)=>{
      //console.log('file2', file);
      //console.log('payload2', payload);
      done(true);
    });
    fa3.on('error', (err)=>{
      console.log('error 3', err);
    });
  }*/],
  (err)=>{
    if(err){return console.log('Error', err);}
    console.log('sending test files', Date.now());
    //var start_time = Date.now();
    //setImmediate(()=>{
      sendFile(`http://localhost:${port}/${agent_1_name}`, [path.resolve(__dirname, 'test.file'), path.resolve(__dirname, 'big.file')], {count:0, big:"data"}, (err, result)=>{
        var end_time = Date.now();
      });
    //});
    
    /*sendFile(`http://localhost:${port}/${agent_1_name}`, path.resolve(__dirname, 'test.file'), {test:"data"}, (err, result, reply)=>{
      console.log('sent 2', path.resolve(__dirname, 'test.file'));
      //server.close();
    });
    sendFile(`http://localhost:${port}/${agent_1_name}`, path.resolve(__dirname, 'test.file2'), {boo:"who"}, (err, result, reply)=>{
      console.log('sent 3', path.resolve(__dirname, 'test.file2'));
      //server.close();
    });*/
  }
);