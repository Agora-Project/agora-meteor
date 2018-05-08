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

    let defaultMod = Meteor.users.findOne({
        "emails.address": moderatorEmail
    });

    if (!Posts.findOne({})) {
        console.log('Adding root post');
        let rootID = Posts.insert({
            summary: 'Forum Root',
            content: 'Welcome to Agora! This is the root post of the forum.\n\nAll posts are either direct or indrect replies to this post.',
            poster: defaultMod._id
        });
    }

    //Deletes all posts and adds a set of random fake posts.
    if (false) {
        console.log('Deleting all posts');
        Posts.remove({});

        console.log('Adding root post');
        let rootID = Posts.insert({
            summary: 'Forum Root',
            content: 'Welcome to Agora! This is the root post of the forum.\n\nAll posts are either direct or indrect replies to this post.',
            poster: defaultMod._id
        });

        console.log("Adding fake posts");
        let posts = [rootID];

        for (let i=0; i<1200; i++) { //This will add a LOT of posts. You may wish to decrease the number, as it will take a few minutes otherwise.
            //Decrease exponent to more strongly prefer replying to newer posts.
            let random = Math.pow(Math.random(), 0.5);
            let target;
            if (Math.random() > 0.02) target = posts[Math.floor(random*posts.length)];

            let reply = {
                content: 'Fake content.',
                poster: defaultMod._id
            };

            if (target) reply.inReplyTo = target;

            if (Math.random() > 0.5) {
                reply.summary = 'Fake Summary';
            }

            let id = Posts.insert(reply);
            if (target) Posts.update({_id: target}, {$push: {replies: id}});
            posts.push(id);
        }
    }

    console.log('Startup finished');
});
