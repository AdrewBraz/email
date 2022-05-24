import { isEqual } from 'lodash';
import excludedMails from './excludedMails';

export const addAttrs = (attrs, messages) => {
    const { subject, sender } = attrs.envelope;
    const { uid, flags } = attrs;
    const email = `${sender[0].mailbox}@${sender[0].host}`;
    if(!excludedMails.includes(email) && !messages.find(el => uid === el.uid)){
      messages.push({uid, email, subject, flags})
      console.log(messages)
    }
    return null
  }
  
export const shouldBeAnswered = (uid, flags, messages) => {
    const mail = messages.find(item => item.uid === uid);
    const oldFlags = mail.flags
    return (isEqual(oldFlags, flags) && flags.includes('Seen'))
  }
  