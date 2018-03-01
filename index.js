
const path = require('path');
const mkdirp = require('mkdirp');
const util = require('util');
const fs = require('fs');
const crypto = require('crypto');
const EventEmitter = require('events').EventEmitter;

const sendFile = require('@kathan/send-file');
const Async = require('async');
const rimraf = require('rimraf');

const FILE_FLDR_NAME = 'files';

const FileAgent = function(app, agent_root, agent_name, dest_endpoint, callback){
  if ( !(this instanceof FileAgent) ){
    return new FileAgent(app, agent_root, agent_name, dest_endpoint, callback);
  }
  var self = this;
  var hash;
  
  EventEmitter.call(this);
  var router = app.route('/'+agent_name);
  var agent_fldr = path.resolve(agent_root, agent_name);
  var opts = {
    agent_root: agent_root,
    agent_name: agent_name,
    dest_endpoint: dest_endpoint,
    agent_fldr: agent_fldr
  };
  
  log(`Creating agent ${agent_name}`, opts);
  mkdirp(agent_fldr, (err)=>{
    if(err){self.emit('error', err);return callback(`mkdirp: ${err}`);}
    //log(`${agent_fldr} created`);
    //var idx = getLastIndex();
    
    router.post((req, res, next) => {
      //==== Handle POST requests ====
      log(`${agent_name} received request`, Date.now());
      //log('payload', req.body);
      //==== If there are files to process ====
      if(req.files){
        var files = [];
        //==== Convert files from object to array ====
        for(var i in req.files){
          files.push(req.files[i]);
        }
        
        //==== Sort files by name ====
        files.sort((a, b)=>{
          var nameA = a.name.toUpperCase(); // ignore upper and lowercase
          var nameB = b.name.toUpperCase(); // ignore upper and lowercase
          if (nameA < nameB) {
            return -1;
          }
          if (nameA > nameB) {
            return 1;
          }

          // names must be equal
          return 0;
        });
        
        //==== Store file and payload ====
        storeData(files, req.body, (err, file_paths)=>{
          if(err){
            error(err);
            res.status(500);
            res.end();
            return next();
          }
          
          //console.log('storeFile returned', file_paths);
          res.send();
          handleFiles(file_paths, req.body, (result)=>{
            log('handleFile result', result);
            
            next();
          });
        });
      }else{
        res.status(400);
        res.end();
        next();
      }
    });
    
    router.get((req, res, next) => {
      //==== Handle GET requests ====
      self.getFiles((err, files)=>{
        res.json({files:files});
        next();
      });
    });
    
    //log(`Done`);
    callback();
  });
  
  function storeData(files, payload, cb){
    var file_data = [];
    var new_paths = [];
    
    //==== Put file buffers into an array ====
    for(var i in files){
      file_data.push(files[i].data);
    }
    //==== Create "hash" folder based on sha256 hash of file ====
    var file_hash = getHash(file_data);
    var hash_fldr = path.resolve(agent_fldr, file_hash);
    var file_fldr = path.resolve(hash_fldr, FILE_FLDR_NAME);
    
    //==== Create new paths for each file ====
    for(var i in files){
      files[i].new_path = path.resolve(file_fldr, files[i].name);
      new_paths.push(files[i].new_path);
    }
    
    var payload_file = path.resolve(hash_fldr, 'payload.json');
    
    //==== Create folder inside "hash" folder called "file" ====
    mkdirp(file_fldr, (err)=>{
      if(err){self.emit('error', err);return cb(err);}
      
      //==== Serialize payload to file called "payload.json" within "hash" folder ====
      fs.writeFile(payload_file, JSON.stringify(payload), (err)=>{
        if(err){self.emit('error', err);return cb(err);}
        Async.forEach(files,
          (file, next)=>{
            
            //==== Save file to "file" folder ====
            fs.rename(file.path, file.new_path , (err)=>{
              if(err){self.emit('error', err);return next(err);}
              
              next();
            });
          },
          (err)=>{
            if(err){return cb(err);}
            cb(null, new_paths);
          }
        );
      });
    });
  }
  
  function getFile(hash_fldr, cb){
    
    var file_obj = {hash: hash_fldr, path: []};
    fs.readdir(path.resolve(agent_fldr, hash_fldr), (err, files)=>{
      //if(err){error(err);return cb(err);}
      
      Async.forEach(files, (file, next_file)=>{
        if(file === 'payload.json'){
          fs.readFile(path.resolve(agent_fldr, hash_fldr, file), (err, payload)=>{
            file_obj.payload = JSON.parse(payload);
            next_file();
          });
        }else{
          
          fs.readdir(path.resolve(agent_fldr, hash_fldr, file), (err, actual_files)=>{
            Async.forEach(actual_files, (actual_file, next_actual)=>{
              var actual_path = path.resolve(agent_fldr, hash_fldr, file, actual_file);
              file_obj.path.push(actual_path);
              fs.stat(actual_path, (err, stats)=>{
                file_obj.stats = stats;
                next_actual();
              });
            },()=>{
              next_file();
            });
          });
        }
      },(err)=>{
        cb(null, file_obj);
      });
      
    });
  }
  
  this.getFiles = function (cb){
    fs.readdir(agent_fldr, (err, hash_fldrs)=>{
      //if(err){error(err);return cb(err);}
      var result = [];
      Async.forEach(hash_fldrs, (hash_fldr, next)=>{
        if(hash_fldr !== '.DS_Store'){
          getFile(hash_fldr,(err, obj)=>{
            result.push(obj);
            next();
          });
        }else{
          next();
        }
      },(err)=>{
        cb(null, result);
      });
    });
  };
  
  //==== Private Functions ====
  
  function isWritable(path, cb){
    fs.access(path, fs.W_OK, (err)=> {
      if(err){
        error('isWritable', err);
        return cb(false);
      }
      cb(true);
    });
  }
  
  /*function ensureFolder(path, cb){
    if(path){
      
      fs.access(path, (err){
        if(err){
        }
        //log(path, "does not exist.");
        var path_ary = path.split('/'),
            cur_path = '/';
        
        Async.forEachOf(path_ary, (cur_fldr, i, done)=>{
          if(cur_fldr !== ''){
            cur_path += cur_fldr + '/';
            
            if(!fs.existsSync(cur_path)){
              //log(cur_path, "does not exist.");
              fs.mkdir(cur_path, (err) => {
                if(err){
                  error(err);
                  return done(err);
                }
                //log(cur_path, "created.");
                done();
              }); 
            }else{
              done();
            }
          }else{
            done();
          }
        },
        (err)=>{
          if(err){error(err);return cb(err);}
          //log('Created', cur_path);
          cb();
        });
      }else{
        //log(path, 'already exists');
        isWritable(path, (result) => {
          if(result){
            //log(path, 'is writable.');
            cb();
          }else{
            var msg = `${path} is not writable.`;
            log(msg);
            cb(msg);
          }
        });
      }
      });
        
    }else{
      cb();
    }
  }*/
  
  function getHash(file_buffers){
    hash = crypto.createHash('sha256');
    
    for(var i in file_buffers){
      var file_buffer = file_buffers[i];
      //console.log('file_buffer', file_buffer);
      hash.update(file_buffer);
    }
    return hash.digest('hex');
  }
  
  function handleFiles(files, payload, cb){
    //var files = fs.readdirSync(path.resolve(hash_fldr, 'file'));
    //console.log('handleFiles files', files);
    var hash_fldr;
    
    //==== Execute user script ====
    self.emit('file', files, payload, (result)=>{
      
      //==== Send file to next agent ====
      if(result){
        if(!dest_endpoint){
          var msg = 'No destination';
          log(msg);
          return cb(msg);
        }
        
        var start_time = Date.now();
        log(`${agent_name} sending ${files} to ${dest_endpoint}`);
        sendFile(dest_endpoint, files, payload, (err, result, reply)=>{
          log(`Result is ${result}.`);
          if(err){error(err);}
          var end_time = Date.now();
          log(`${agent_name} agent.sendFile result`, result, (end_time-start_time)+' ms');
          //log(`${agent_name} sendFile reply`, reply);
          if(result){
            //==== TODO Remove the file's folder and contents ====
            log(`Success sending ${files} to ${dest_endpoint}`);
            //console.log('files', files);
            if(Array.isArray(files)){
              hash_fldr = path.resolve(path.dirname(files[0]), '..');
            }else{
              hash_fldr = path.resolve(path.dirname(files), '..');
            }
            rimraf(hash_fldr, (err)=>{
              if(err){error(err);}
              log(`Removed ${hash_fldr}`);
              cb(true);
            });
          }else{
            //error(reply.statusCode);
            cb(false);
          }
        });
      }else{
        //TODO send to failed
        log('User script did not reply true');
        cb('User script did not reply true');
      }
    });
  }
  
  function log(){
    var d = new Date();
    const args = Array.from(arguments);
    args.unshift(d);
    console.log.apply(this, args);
  }
  
  function error(){
    const args = Array.from(arguments);
    args.unshift('ERROR:');
    var e = new Error();
    args.push(e.stack);
    log.apply(null, args);
  }
};
util.inherits(FileAgent, EventEmitter);

module.exports = FileAgent;