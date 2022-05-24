import { CronJob } from 'cron';
import Imap from 'imap'
import nodemailer from 'nodemailer';
import fs from 'fs'
import { promisify } from 'util';
import { addAttrs } from './utils';
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

const state = {
  messages: []
}

const html = fs.readFileSync(`${__dirname}/index.html`, 'utf8')

const openBox = promisify(imap.openBox.bind(imap))
const search = promisify(imap.search.bind(imap))

const closeConnections = (transporter) => {
  imap.end()
  transporter.close()
  imap.destroy()
  console.log('connection closed')
}
const fetch = async (results) => {
  const { messages } = state;
  const f =  imap.fetch(results, { bodies: 'HEADER', struct: true, envelope: true })
  f.on('message', function(msg, seqno) {
    console.log('Message #%d', seqno);
    let prefix = '(#' + seqno + ') ';
    msg.once('attributes', async (attrs) => {
      addAttrs(attrs, messages)
    });
    msg.once('end', function() {
      console.log(prefix + 'Finished');
    });
  });
  f.once('error', function(err) {
    console.log('Fetch error: ' + err);
  });
  f.on('end', () => {
    console.log('Fetching ended')
  })
}

const connectFunc = async (transporter) => {
    console.log('open box')
    await openBox('INBOX', false)
      .then(box => console.log(box))
      .catch(err => console.log(err))
    await search([ 'UNSEEN', ['SINCE', 'May 24, 2021'] ])
      .then((results) => {
        if(results.length > 0){
          fetch(results, transporter)
        }
      })
      .catch(err => {
        throw new Error(err)
      })
  imap.on('update', (seqno, info) => {
    const { flags, uid } = info;
    console.log(flags, uid)
  })
  setTimeout(() => {
    closeConnections(transporter)
  }, 110000)
}

const main = () => {
  const transporter = nodemailer.createTransport({
    host: 'smtp.yandex.ru',
    port: 465,
    secure: false,
    auth: {
      user: 'andyWitman@yandex.ru',
      pass: 'Rem32123'
    }
  })
  try{
  console.log('start')
  imap.once('ready', () => {
    connectFunc(transporter)
  })
  imap.connect()
  } catch(err){
    console.log(err)
    closeConnections(transporter)
  }
}

const job = new CronJob(
  '0 */2 * * * *',
  () => {
    console.log('message')
    main()
  },
  null,
  true
)

job.start()