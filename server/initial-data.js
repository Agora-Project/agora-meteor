/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: AGPL-3.0, Check file LICENSE
*/

Meteor.startup(function() {
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

        Roles.addUsersToRoles(moderatorId, ['moderator']);
    }

    //Set up test user account if it does not exist.
    let userEmail = "user@example.com";
    if (!Meteor.users.findOne({
        "emails.address": userEmail
    })) {
        console.log("Adding default user");
        let moderatorId = Accounts.createUser({
            email: userEmail,
            password: "user1pass",
            username: "User"
        });

        Meteor.users.update({
            "emails.address": userEmail
        }, {$set: {"emails.$.verified": true}});
    }

    let defaultMod = Meteor.users.findOne({
        "emails.address": moderatorEmail
    });

    let user = Meteor.users.findOne({
        "emails.address": userEmail
    });

    if (!Posts.findOne({})) {
        console.log('Adding root post');
        let rootID = Posts.insert({
            summary: 'Forum Root',
            content: 'Welcome to Agora! This is the root post of the forum.',
            attributedTo: defaultMod.actor,
            local: true
        });
    }

    //Deletes all posts and adds a set of random test posts.
    if (false) {
        console.log('Deleting all posts');
        Posts.remove({});

        console.log('Adding root post');
        let root_ID = Posts.insert({
            summary: 'Forum Root',
            content: 'Welcome to Agora! This is the root post of the forum.',
            attributedTo: defaultMod.actor,
            local: true
        });

        console.log("Adding test posts");

        let id = Posts.findOne({_id: root_ID}).id;
        let posts = [id];

        for (let i=0; i<12; i++) { //Add posts. Beware, anything above a thousand will take a little bit.
            //Decrease exponent to more strongly prefer replying to newer posts.
            let random = Math.pow(Math.random(), 0.5);
            let target;
            if (Math.random() > 0.02) target = posts[Math.floor(random*posts.length)];

            let reply = {
                content: 'Test content.',
                attributedTo: user.actor,
                local: true
            };

            if (target) {
                reply.inReplyTo = target;
            }

            if (Math.random() > 0.5) {
                reply.summary = 'Test Summary';
            }

            let _id = Posts.insert(reply);
            let id = Posts.findOne({_id: _id}).id;
            posts.push(id);
        }
    }

    console.log('Startup finished');
});
