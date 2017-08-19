"use strict";
var fs = require('fs'),
    url = require('url'),
    ignore = ['.DS_Store', '.file-agent'],
    Async = require('async'),
    path = require('path'),
    execSync = require('child_process').execSync,
FileAgent = function(in_fldr, out_fldrs, fld_fldr, fn, callback){
  if ( !(this instanceof FileAgent) ){return new FileAgent(in_fldr, out_fldrs, fld_fldr, fn, callback);}
  var in_folder,
      out_folders = {},
      failed_folder,
      func,
      watcher,
      active = false,
      self = this;
      
  this.setInFolder = function(in_fldr, cb){
    if(typeof in_fldr === 'string'){
      var is_active = active;
      this.stop();
      ensureFolder(in_fldr, (err)=>{
        if(!err){
          in_folder = in_fldr;
        }
        if(is_active){
          return this.start((re) => {
            cb(re);
          });
        }
        if(in_folder[in_folder.length-1] !== '/'){
          in_folder += '/';
        }
        
        cb();
      });
    }else{
      cb('In folder parameter must be an object.');
    }
  }
  
  this.setOutFolders = function(out_fldrs, cb){
    if(typeof out_fldrs === 'object'){
      Async.forEachOf(out_fldrs, (out_fldr, i, done)=>{
        ensureFolder(out_fldr, (err)=>{
          if(!err){
            if(out_fldr[out_fldr.length-1] !== '/'){
              out_fldr += '/';
            }
            out_folders[i] = out_fldr;
          }
          
          return done(err);
        });
      },
      (err)=>{
        return cb(err);
      });
    }else{
      return cb('Out folders parameter must be an object.');
    }
  }
  
  this.setFailedFolder = function(fld_fldr, cb){
    if(typeof in_fldr === 'string'){
      ensureFolder(fld_fldr, (err)=>{
        if(!err){
          failed_folder = fld_fldr;
          if(failed_folder[failed_folder.length-1] !== '/'){
            failed_folder += '/';
          }
        }
        return cb(err);
      });
    }else{
      cb('Failed folder parameter must be an object.');
    }
  }
  
  this.setFunction = function(fn, cb){
    
    if(typeof fn === 'function'){
      var is_active = active;
      this.stop();
      func = fn;
      if(is_active){
        return this.start((err)=>{
          cb(err);
        });
      }
      return cb();
    }else{
      return cb('Parameter must be a type function.');
    }
  }
  
  function ensureFolder(path, cb){
    if(path){
      if(!fs.existsSync(path)){
        var path_ary = path.split('/'),
            cur_path = '/';
        
        Async.forEachOf(path_ary, (cur_fldr, i, done)=>{
          if(cur_fldr !== ''){
            cur_path += cur_fldr + '/';
            
            if(!fs.existsSync(cur_path)){
              fs.mkdir(cur_path, (err) => {
                if(err){
                  var d = new Date();
                  console.log(d, 'Error creating', cur_path, err);
                }
                done(`${err}`);
              }); 
            }
          }else{
            done();
          }
        },
        (err)=>{
          var d = new Date();
          console.log(d, 'Created', cur_path);
          cb(err);
        });
      }else{
        var d = new Date();
        console.log(d, path, 'exists');
        isWritable(path, (result) => {
          if(result){
            cb();
          }else{
            cb(`${path} is not writable.`);
          }
        });
      }
    }else{
      cb();
    }
  }
  
  function isWritable(path, cb){
    fs.access(path, fs.W_OK, function(err) {
      if(err){
        return cb(false);
      }
      cb(true);
    });
  }
  
  function wrapperFunction(eventType, filename){
    var orig_path = in_folder+ filename,
        new_path = failed_folder+ filename;
    console.log(orig_path, 1, eventType);
    if(ignore.indexOf(filename) === -1 && fs.existsSync(orig_path)){
      var start = new Date();
      isBeingWritten(orig_path, (result) => {
        console.log(orig_path, 3, (new Date()-start));
        func(eventType, filename, in_folder, out_folders, failed_folder, (out)=>{
          var d = new Date();
          console.log(d, 'Found', orig_path);
          if(out && out_folders[out] && fs.existsSync(out_folders[out])){
            new_path = out_folders[out] + filename;
          }
          
          if(fs.existsSync(orig_path)){
            var d = new Date();
            console.log(d, 'Moving', orig_path, '->', new_path);
            fs.rename(orig_path, new_path, ()=>{});
          }
        });
      });
    }
  }
  
  function isBeingWritten(filepath, cb){
    fs.open(filepath, 'r+', (err) => {
      console.log('fs.open error', err);
      if(err){
        cb(false);
      }else{
        cb(true);
      }
    });
  }
  
  function isBeingWrittenlsof(filepath, cb){
    var start = new Date(),
        file = path.basename(filepath),
        dir = path.dirname(filepath);
        
    //console.log('lsof start', start);
    var cmd = `/usr/sbin/lsof -c Finder +D "${dir}" | grep "${file}"`;
    console.log('cmd', cmd);
    try{
      cb(execSync(cmd));/*, (err, stdout, stderr)=>{
      var end = new Date();
      console.log('lsof end', (end-start));
      cb();
    });*/
    } catch (err) {
      cb(err);
    }
  }
  
  function processExisting(cb){
    var d = new Date();
    console.log(d, `Processing existing files in ${in_folder}.`);
    fs.readdir(in_folder, (err, files) => {
      if(err){return cb(err);}
      for(var i in files){
        //console.log(files[i]);
        wrapperFunction('existing', files[i]);
      }
      cb();
    });
  }
  
  this.start = function(cb){
    ensureFolder(in_folder, (err) => {
      if(!active && fs.existsSync(in_folder)){
        return processExisting((err)=>{
          if(err){return cb(err);}
          watcher = fs.watch(in_folder, wrapperFunction);
          var d = new Date();
          console.log(d, "Watching", in_folder);
          active = true;
          cb();
        });
      }
      return cb(err);
    });
  }
  
  this.stop = function(){
    if(active){
      watcher = fs.watch(in_folder);
      active = false;
    }
  }
  
  Object.assign(this, {});
  /* Constructor code */
  var out = (done) => {
    this.setOutFolders(out_fldrs, (err)=>{
      done(err);
    });
  },
  failed = (done) => {
    this.setFailedFolder(fld_fldr, (err)=>{
      done(err);
    });
  },
  inf = (done) => {
    this.setInFolder(in_fldr, (err)=>{
      done(err);
    });
  },
  fun = (done)=>{
    this.setFunction(fn, (err)=>{
      done(err);
    });
  };
  Async.parallel([out, failed, inf, fun],
  (err)=>{
    callback(err, self);
  });
}

FileAgent.prototype.constructor = FileAgent;
module.exports = FileAgent;