
import webfinger from '../lib/webfinger/lib/webfinger.js';
import request from 'request';

webfinger.webfinger('Angle@anticapitalist.party', (err, stuff) => {console.log("Stuff:", stuff)});
