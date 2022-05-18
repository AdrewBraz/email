import Imap from 'imap';
import fs from 'fs'
import  path from 'path'
import { result } from 'lodash';
import nodemailer from 'nodemailer';
// import connect from './connect'

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
  console.log('smthv1')
  const { subject, sender } = attrs.envelope;
  const { uid } = attrs;
  const { messages } = state;
  const email = `${sender[0].mailbox}@${sender[0].host}`;
  if(!excludedMails.includes(email)){
    console.log('smthv')
    messages.push({uid, email, subject})
    console.log(messages)
  }
  return null
}

const connectFunc = () => {
    const {seqnos, messages} = state;
    console.log('open box')
    imap.openBox('INBOX', false, async (err, box) => {
      if (err) throw err;
      await imap.search([ 'UNSEEN', ['SINCE', 'Apr 01, 2021'] ], function(err, results) {
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
            console.log(`Message ${seqno}`);
            let prefix = '(#' + seqno + ') ';
            msg.once('attributes', (attrs) => {
              console.log('message')
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

imap.on('ready', connectFunc)

// imap.on('mail', (numNewMsgs) => {
//   console.log(numNewMsgs)
//   // imap.search(['NEW'], (err, results) => {
//   //   if(err) throw err
//   //   const f = imap.fetch(results, { bodies: 'HEADER', struct: true, envelope: true })
//   // })
// })

imap.on('update', (seqno, info) => {
  const { flags, uid } = info;
  if(flags.includes('\\Seen')){
    const message = state.messages.find(item => item.uid === uid)
    if(message){
      const { email, subject } = message
      console.log(message)
      transporter.sendMail({
              from: 'andyWitman@yandex.ru',
              to: email,
              subject: subject,
              html
          }, (err, info) => {
            if(err){
              console.log(err + "FUUUUUCKL")
            }
          })
    }
  } return
})

imap.on('error', function(err) {
  console.log('TCT ERR' + err.code);
  imap.destroy()
  console.log('connection destroyed')
  imap.connect()
});

imap.connect()

  
