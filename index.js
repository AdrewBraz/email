import Imap from 'imap';
import { inspect } from 'util';
import {Base64Decode} from 'base64-stream';
import fs from 'fs'
import  path from 'path'
import { result } from 'lodash';

const imap = new Imap({
    user: 'smp_routes@mail.ru',
    password: 'CardioSmp',
    host: 'imap.mail.ru',
    port: 993,
    tls: true,
});

const toUpper = (thing) => thing && thing.toUpperCase ? thing.toUpperCase() : thing;

const cleanEmptyFoldersRecursively = (folder) => {
    const isDir = fs.statSync(folder).isDirectory();
    if (!isDir) {
      return;
    }
    const files = fs.readdirSync(folder);
    if (files.length > 0) {
      files.forEach((file) => {
        const fullPath = path.join(folder, file);
        cleanEmptyFoldersRecursively(fullPath);
      });
      files = fs.readdirSync(folder);
    }

    if (files.length == 0) {
      console.log("removing: ", folder);
      fs.rmdirSync(folder);
      return;
    }
  }


function findAttachmentParts(struct, attachments) {
  attachments = attachments ||  [];
  for (var i = 0, len = struct.length, r; i < len; ++i) {
    if (Array.isArray(struct[i])) {
      findAttachmentParts(struct[i], attachments);
    } else {
      if (struct[i].disposition && ['INLINE', 'ATTACHMENT'].indexOf(toUpper(struct[i].disposition.type)) > -1) {
        attachments.push(struct[i]);
      }
    }
  }
  return attachments;
}

 function buildAttMessageFunction(attachment, header) {
  var filename = attachment.params.name.length > 25 ? attachment.params.name.slice(-24) : attachment.params.name
  var encoding = attachment.encoding;
  const dirName = (header).replace('Fwd: ', '').replace(/\./g, '')
  const pathName = `\\\\172.16.11.205\\mc_scans\\СМП\\${dirName}`
  if(fs.existsSync(pathName)){
    fs.mkdir(`${pathName}_Повторно`, { recursive: true}, (err) => {
        if(err) throw err
    })
  } else{
    fs.mkdir(pathName, { recursive: true}, (err) => {
        if(err) throw err
    })
  }
  return function (msg, seqno) {
    var prefix = '(#' + seqno + ') ';
    msg.on('body', function(stream, info) {
      //Create a write stream so that we can stream the attachment to file;
      console.log(prefix + 'Streaming this attachment to file', filename, info);
      var writeStream = fs.createWriteStream(path.resolve(pathName, filename));
      writeStream.on('finish', function() {
        console.log(prefix + 'Done writing to file %s', filename);
      });

      //stream.pipe(writeStream); this would write base64 data to the file.
      //so we decode during streaming using 
      if (toUpper(encoding) === 'BASE64') {
        //the stream is base64 encoded, so here the stream is decode on the fly and piped to the write stream (file)
        stream.pipe(new Base64Decode()).pipe(writeStream);
      } else  {
        //here we have none or some other decoding streamed directly to the file which renders it useless probably
        stream.pipe(writeStream);
      }
    });
    msg.once('end', function() {
      console.log(prefix + 'Finished attachment %s', filename);
    });
  };
}

imap.once('ready', function() {
  imap.openBox('INBOX', false, function(err, box) {
    console.log(box)
    if (err) throw err;
    imap.search(['UNSEEN', ['SINCE', 'March 20, 2021']], (err, result) => {
        if(err) throw err;
        console.log(result)
        var f =  imap.fetch(result, {
            bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)'],
            struct: true,
            markSeen: true
        });
        f.on('message', function (msg, seqno) {
            let header;
            console.log('Message #%d', seqno);
            var prefix = '(#' + seqno + ') ';
            msg.on('body', function(stream, info) {
                var buffer = '';
                stream.on('data', function(chunk) {
                buffer += chunk.toString('utf8');
                });
                stream.once('end', function() {
                console.log(prefix + 'Parsed header: %s', Imap.parseHeader(buffer));
                header = Imap.parseHeader(buffer).subject[0]
                });
            });
            msg.once('attributes', function(attrs) {
                var attachments = findAttachmentParts(attrs.struct);
                const uid = attrs.uid;
                console.log(prefix + 'Has attachments: %d', attachments.length);
                for (var i = 0, len=attachments.length ; i < len; ++i) {
                var attachment = attachments[i];
                console.log(prefix + 'Fetching attachment %s', attachment.params.name);
                var f = imap.fetch(attrs.uid , { //do not use imap.seq.fetch here
                    bodies: [attachment.partID],
                    struct: true
                });
                //build function to process attachment message
                f.on('message', buildAttMessageFunction(attachment, header));
                }
                imap.addFlags(uid, ['\\Seen'], (err) => {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log("Marked as read!")
                    }
                })
            });
            msg.once('end', function() {
                console.log(prefix + 'Finished email');
            });
        });
        f.once('error', function(err) {
            console.log('Fetch error: ' + err);
        });
        f.once('end', function() {
            console.log('Done fetching all messages!');
            imap.end();
        });
    })
  });
});

imap.once('error', function(err) {
  console.log(err);
});

imap.once('end', function() {
  console.log('Connection ended');
});

imap.connect()
imap.status();

// cleanEmptyFoldersRecursively('\\\\172.16.11.205\\mc_scans\\Направления на СМП\\')