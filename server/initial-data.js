/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: AGPL-3.0, Check file LICENSE
*/

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
});
