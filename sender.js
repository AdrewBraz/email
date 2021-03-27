import Imap from 'imap';
import { inspect } from 'util';
import {Base64Decode} from 'base64-stream';
import fs from 'fs'
import  path from 'path'
import { result } from 'lodash';
import nodemailer from 'nodemailer';

import excludedMails from './excludedMails';

const imap = new Imap({
    user: 'smprknpk@ya.ru',
    password: 'd8FtZkHMkj4T5rE',
    host: 'imap.yandex.ru',
    port: 993,
    tls: {
      secureProtocol: "TLSv1_method"
  },
    keepalive: {
      forceNoop: true
    }
});

const state = {
  messages: []
}


const html = fs.readFileSync(`${__dirname}/index.html`, 'utf8')

console.log(html)
const main = async (obj) => {
    const {email, subject} = obj;
  let transporter = nodemailer.createTransport({
      host: 'smtp.yandex.ru',
      port: 587,
      secure: false,
      auth: {
        user: 'smprknpk@ya.ru',
        pass: 'd8FtZkHMkj4T5rE'
      }
  })

  let info = await transporter.sendMail({
      from: 'smprknpk@ya.ru',
      to: email,
      subject: subject,
      html
  })
}

const addAttrs = (attrs) => {
  const { subject, sender } = attrs.envelope;
  const { uid } = attrs;
  const { messages } = state;
  const email = `${sender[0].mailbox}@${sender[0].host}`;
  messages.push({uid, email, subject})
  console.log(messages)
}

imap.on('update', (seqno, info) => {
  const { flags, uid } = info;
  console.log(uid)
  if(flags.includes('\\Seen')){
    console.log(info)
    const message = state.messages.find(item => item.uid === uid)
     main(message).catch(console.error)
  } return
})


imap.once('ready', () => {
    const {seqnos, messages} = state;
    imap.openBox('INBOX', false, (err, box) => {
      if (err) throw err;
      imap.search([ 'UNSEEN', ['SINCE', 'Mar 01, 2021'] ], function(err, results) {
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
        // f.once('end', function() {
        //   console.log('Done fetching all messages!');
        //   arr.forEach( item => {
        //       main(item).catch(console.error)
        //   })
        //   imap.end();
        // });
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
})

imap.once('error', function(err) {
    console.log(err);
  });
  
  imap.once('end', function() {
    console.log('Connection ended');
  });
  
  imap.connect()