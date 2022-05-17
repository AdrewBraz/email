import Imap from 'imap';
import fs from 'fs'
import  path from 'path'
import { result } from 'lodash';
import nodemailer from 'nodemailer';

import excludedMails from './excludedMails';

const imap = new Imap({
    user: 'andyWitman@yandex.ru',
    password: 'Rem32123',
    host: 'imap.yandex.ru',
    port: 993,
    tls: {
      secureProtocol: "TLSv1_method"
  },
    keepalive: {
      forceNoop: true
    }
});

const transporter = nodemailer.createTransport({
  host: 'smtp.yandex.ru',
  port: 587,
  secure: false,
  auth: {
    user: 'andyWitman@yandex.ru',
    pass: 'Rem32123'
  }
})

const state = {
  messages: []
}


const html = fs.readFileSync(`${__dirname}/index.html`, 'utf8')

//   let info = await transporter.sendMail({
//       from: 'smprknpk@ya.ru',
//       to: email,
//       subject: subject,
//       html
//   })
// }

const addAttrs = (attrs) => {
  const { subject, sender } = attrs.envelope;
  const { uid } = attrs;
  const { messages } = state;
  const email = `${sender[0].mailbox}@${sender[0].host}`;
  if(!excludedMails.includes(email)){
    messages.push({uid, email, subject})
  }
  return null
}

const connectFunc = () => {
    const {seqnos, messages} = state;
    imap.openBox('INBOX', false, (err, box) => {
      if (err) throw err;
      imap.search([ 'UNSEEN', ['SINCE', 'Apr 01, 2021'] ], function(err, results) {
        if (err) throw err;
        const f = imap.fetch(results, { bodies: 'HEADER', struct: true, envelope: true });
        f.on('message', function(msg, seqno) {
          console.log('Message #%d', seqno);
          let prefix = '(#' + seqno + ') ';
          msg.once('attributes', (attrs) => {
            addAttrs(attrs)
          });
          msg.once('end', function() {
            console.log(prefix + 'Finished');
          });
        });
        f.once('error', function(err) {
          console.log('Fetch error: ' + err);
        });
      });
      imap.on('mail',  (numNewMsgs) => {
        imap.search(['NEW'], (err, results) => {
          if(err) throw err;
          const f = imap.fetch(results, { bodies: 'HEADER', struct: true, envelope: true });
          f.on('message', function(msg, seqno) {
            console.log('Message #%d', seqno);
            let prefix = '(#' + seqno + ') ';
            msg.once('attributes', (attrs) => {
              addAttrs(attrs)
            });
            msg.once('end', function() {
              console.log(prefix + 'Finished');
            });
          });
          f.once('error', function(err) {
            console.log('Fetch error: ' + err);
          });
        })
    })
    });
}

imap.on('update', (seqno, info) => {
  const { flags, uid } = info;
  if(flags.includes('\\Seen')){
    console.log(state)
    const message = state.messages.find(item => item.uid === uid)
    if(message){
      const { email, subject } = message
      transporter.sendMail({
              from: 'andyWitman@yandex.ru',
              to: email,
              subject: subject,
              html
          }, (err, info) => {
            if(err){
              console.log(err + "FUUUUUCKL")
            }
          console.log(info)
          })
    }
  } return
})

imap.once('error', function(err) {
  console.log(err + '  watta fuck');
});

  imap.once('ready', connectFunc)
  imap.connect()

  
