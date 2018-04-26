/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: AGPL-3.0, Check file LICENSE
*/

import webfinger from '../lib/webfinger/lib/webfinger.js';

Meteor.startup(function() {
    //Deletes all posts and adds a set of random fake posts.
    if (!Posts.findOne({})) {
        console.log('Adding root post');
        let rootID = Posts.insert({
            title: 'Forum Root',
            content: 'Welcome to Agora! This is the root post of the forum.\n\nAll posts are either direct or indrect replies to this post.'
        });
    }
    if (false) {
        console.log('Deleting all posts');
        Posts.remove({});

        console.log('Adding root post');
        let rootID = Posts.insert({
            title: 'Forum Root',
            content: 'Welcome to Agora! This is the root post of the forum.\n\nAll posts are either direct or indrect replies to this post.'
        });

        console.log("Adding fake posts");
        let posts = [rootID];

        for (let i=0; i<100200; i++) { //This will add a LOT of posts. You may wish to decrease the number, as it will take a few minutes otherwise.
            //Decrease exponent to more strongly prefer replying to newer posts.
            let random = Math.pow(Math.random(), 0.5);
            let target;
            if (Math.random() > 0.02) target = posts[Math.floor(random*posts.length)];

            let reply = {
                content: 'Fake content.'
            };

            if (target) reply.target = target;

            if (Math.random() > 0.5) {
                reply.title = 'Fake Title';
            }

            let id = Posts.insert(reply);
            if (target) Posts.update({_id: target}, {$push: {replies: id}});
            posts.push(id);
        }
    }

    //Set up moderator account if it does not exist.
    let moderatorEmail = "moderator@example.com";
    if (!Meteor.users.findOne({
        "emails.address": moderatorEmail
    })) {
        console.log("Adding default moderator");
        let moderatorId = Accounts.createUser({
            email: moderatorEmail,
            password: "mod1pass",
            username: "Moderator"
        });

        Meteor.users.update({
            "emails.address": moderatorEmail
        }, {$set: {"emails.$.verified": true}});

        return Roles.addUsersToRoles(moderatorId, ['moderator']);
    }

    console.log('Startup finished');

    request = require('request');
    discover = webfinger.discover;
    hostmeta = webfinger.hostmeta;
    lrdd = webfinger.lrdd;

    const fediverse = (address) => {
        console.log('address:', address);
        let linkData = webfinger.webfinger(address, (err, stuff) => {console.log("Stuff:", err, stuff)});
        //console.log("Link Data:", linkData);
        return linkData;
    };

    const is_missing_domain = (address) => /^@[a-zA-Z0-9-._]+$/.test(address);
    const head = (url) => request({url: url, method: 'HEAD'});
    const get = (url, response_handler) => request({url: url, method: 'GET'});

    const investigate = (address) => {
        return new Promise((resolve, reject) => {
            let profiles;

            if( is_missing_domain(address) ) {
                console.log("Missing domain!");
            } else {
                profiles = Promise.all([fediverse(address)]);
            }

            profiles
                .then((profiles) => address.profiles = profiles.filter((href) => Boolean(href)))
                .then((address) => resolve(address))
                .catch((reason) => console.log('caught', reason));
        });
    }

    function as_promised(fn) {
        return (...args) => {
            return new Promise((resolve, reject) => {
                fn(...args, (err, res) => {
                    if ( err ) { reject(err); }
                    else { resolve(res); }
                });
            });
        };
    }

    // -----------------

    investigate('Angle@anticapitalist.party')
        .then((dossier) => { console.log("dossier:", dossier); })
    .catch((reason) => { console.log('caught', reason); });

    /*investigate('rburns@kosmos.social')
        .then((dossier) => { console.log("dossier:", dossier); })
    .catch((reason) => { console.log('caught', reason); });

    investigate('gargron@mastodon.social')
        .then((dossier) => { console.log("dossier:", dossier); })
    .catch((reason) => { console.log('caught', reason); });*/
});
