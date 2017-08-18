/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: GPL, Check file LICENSE
*/

Meteor.startup(function() {
    //Deletes all posts and adds a set of random fake posts.
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

        for (let i=0; i<500; i++) {
            //Decrease exponent to more strongly prefer replying to newer posts.
            let random = Math.pow(Math.random(), 0.1);
            let target = posts[Math.floor(random*posts.length)];

            let reply = {
                content: 'Fake content.',
                target: target
            };

            if (Math.random() > 0.5) {
                reply.title = 'Fake Title';
            }

            let id = Posts.insert(reply);
            Posts.update({_id: target}, {$push: {replies: id}});
            posts.push(id);
        }
    }

    //Compute default layout of posts.
    console.log('Laying out posts');
    let posts = {};
    Posts.find({}, {fields: {'_id': 1, 'target': 1}}).forEach(function(post) {
        posts[post._id] = post;
    });

    let grapher = new LayeredGrapher.layoutGraph(posts);

    for (let id in posts) {
        let post = posts[id];
        Posts.update({_id: id}, {$set: {defaultPosition: {x: post.position.x, y: post.position.y}, subtreeWidth: post.subtreeWidth}});
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
