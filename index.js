/*

*/
"use strict";
var fs = require('fs'),
    ignore = ['.DS_Store', '.file-agent'],
    Async = require('async'),
    path = require('path'),
    execSync = require('child_process').execSync,
FileAgent = function(opts, callback){
  if ( !(this instanceof FileAgent) ){return new FileAgent(opts, callback);}
  var in_folder,
      out_folders = {},
      failed_folder,
      func,
      watcher,
      active = false,
      self = this,
      filters;
      
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
      cb('setInFolder parameter must be a string. Received a '+typeof in_fldr);
    }
  };
  
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
      return cb('setOutFolders parameter must be an object. Received a '+typeof out_fldrs);
    }
  };
  
  this.setFilters = function (fil, cb){
    filters = fil;
    cb();
  };
  
  this.setFailedFolder = function(fld_fldr, cb){
    if(typeof fld_fldr === 'string'){
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
      cb('setFailedFolder parameter must be a string. Received a '+typeof fld_fldr);
    }
  };
  
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
      return cb('setFunction parameter must be a function.');
    }
  };
  
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
    console.log(new Date(), 'wrapperFunction', orig_path, eventType);
    if(ignore.indexOf(filename) === -1 && fs.existsSync(orig_path)){
      filterCheck(orig_path, (result)=>{
        if(result){
          setImmediate(()=>{
            isBeingWritten(orig_path, (result) => {
              //console.log(new Date(), orig_path, result);
              if(!result){
                
                console.log(new Date(), 'Found', orig_path);
                func(eventType, filename, in_folder, out_folders, failed_folder, (out)=>{
                  var d = new Date();
                  
                  if(out && out_folders[out] && fs.existsSync(out_folders[out])){
                    new_path = out_folders[out] + filename;
                  }
                  
                  if(fs.existsSync(orig_path)){
                    d = new Date();
                    console.log(d, 'Moving', orig_path, '->', new_path);
                    fs.rename(orig_path, new_path, ()=>{});
                  }
                });
              }else{
                console.log(new Date(), `${filename} is being written.`);
              }
            });
          });
        }else{
          console.log(new Date(), `${filename} didn't match filter.`);
        }
      });
    }else{
      //console.log(`Skipping ${filename}`);
    }
  }
  
  function filterCheck(filepath, cb) {
    /* Check extension */
    var result = true;
    console.log('Filter check', filters);
    if(filters.extensions && Array.isArray(filters.extensions)){
      console.log('Checking extensions', filters.extensions);
      var ext = path.extname(filepath).replace(/^./, '');
      console.log(filepath, ext);
      if(filters.extensions.indexOf(ext) === -1){
        result = false;
      }
    }
    cb(result);
  }
  
  function isBeingWritten(filepath, cb){
    
      //TODO - fix path
      var cmd = `/usr/local/lib/node_modules/lsof-mac-fast/vendor/fast_lsof -w '${filepath}'`;
      console.log(new Date(), 'isBeingWritten cmd', cmd);
      try{
        var stdout = execSync(cmd);
        
        if(stdout){
          console.log(new Date(), 'stdout', stdout);
          cb(true);
        }else{
          cb(false);
        }
      }catch(err){
        cb(false);
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
  };
  
  this.stop = function(){
    if(active){
      watcher = fs.watch(in_folder);
      active = false;
    }
  };
  
  Object.assign(this, {});
  /* Constructor code */
  var fns = [(done) => {
    this.setInFolder(opts.in, (err)=>{
      done(err);
    });
  }];
  
  if(opts.filters){
    fns.push((done) => {
      this.setFilters(opts.filters, (err)=>{
        done(err);
      });
    });
  }
  
  if(opts.failed){
    fns.push((done) => {
      this.setFailedFolder(opts.failed, (err)=>{
        done(err);
      });
    });
  }
  
  if(opts.iterator){
    fns.push((done)=>{
      this.setFunction(opts.iterator, (err)=>{
        done(err);
      });
    });
  }
  
  if(opts.out){
    fns.push((done) => {
      this.setOutFolders(opts.out, (err)=>{
        done(err);
      });
    });
  }
  
  Async.parallel(fns,
    (err)=>{
      callback(err, self);
    }
  );
};

FileAgent.prototype.constructor = FileAgent;
module.exports = FileAgent;

/*function isBeingWrittenLsof(filepath, cb){
    var start = new Date();


        
    if(checking === false){
      var cmd = `sudo /usr/sbin/lsof -f -w -n -- "${filepath}"`;
      console.log(new Date(), 'cmd', cmd);
      checking = true;
      exec(cmd, (err, stdout, stderr)=>{
        checking = false;
        if(err){console.log(new Date(), 'lsof error', err); return cb(true);}
        var end = new Date();
        console.log(new Date(), 'lsof end', stdout, (end-start));
        if(stdout){
          cb(true);
        }else{
          cb(false);
        }
      });
    }else{
      cb(true);
    }
  }
  function isBeingWrittenOpened(filepath, cb){
    var Opened = require('@ronomon/opened');
    var paths = [path.dirname(filepath)];
    Opened.files(paths,
      (error, hashTable) => {
        if (error) throw error;
        paths.forEach(
          (path) => {
            console.log(new Date(), path + ' open=' + hashTable.hasOwnProperty(path));
          }
        );
        cb();
      }
    );
  }
  
  function isBeingWrittenOpen(filepath, cb){
  
    fs.open(filepath, 'r+', (err, fd) => {
      console.log(new Date(), 'fs.open error', err);
      if(err){
        cb(true);
      }else{
        cb(false);
      }
    });
  }         
  
  function isBeingWrittenLsofSync(filepath, cb){
    var file = path.basename(filepath),
        dir = path.dirname(filepath);
        
    //console.log('lsof start', start);
    //var cmd = `/usr/sbin/lsof -F n -- "${dir}" | grep "${file}"`;
    if(checking === false){
      checking = true;
      var cmd = `/usr/sbin/lsof -F -P -l -M +D "${dir}" | grep "${file}"`;
      console.log(new Date(), 'cmd', cmd);
      
      try{
        
        var re = execSync(cmd);
        console.log(new Date(), 'execSync result', `${re}`);
        checking = false;
        cb(true);
      } catch (err) {
        checking = false;
        cb(false);
      }
    }else{
      cb(true);
    }
  }
  
  function isBeingWrittenFuser(filepath, cb){
    var start = new Date();
    if(checking === false){
      //console.log('lsof start', start);
      //var cmd = `/usr/sbin/lsof -F n -- "${dir}" | grep "${file}"`;
      var cmd = `/usr/bin/fuser -u "${filepath}"`;
      console.log(new Date(), 'cmd', cmd);
      checking = true;
      exec(cmd, (err, stdout, stderr)=>{
        checking  = false;
        var end = new Date();
        console.log(new Date(), 'fuser end', stdout, (end-start));
        if(stdout){
          cb(true);
        }else{
          cb(false);
        }
      });
    }else{
      cb(true);
    }
  }*/