/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: GPL, Check file LICENSE
*/

Meteor.startup(function() {
    let DEBUG_RESET = true; //Deletes all posts and add a set of random fake posts.
    
    if (DEBUG_RESET) {
        console.log('Deleting all posts');
        Posts.remove({});
    }
    
    if (!Posts.findOne({$where : '!this.links || this.links.length < 1'})) {
        console.log("Adding root post");
        Posts.insert({
            title: 'Forum Root',
            links: []
        });
    }
    
    if (DEBUG_RESET) {
        console.log("Adding fake posts");
        for (let i=0; i<4; i++) {
            let posts = [];
            Posts.find({}, {fields: {'_id': 1}}).forEach(function(post) {
                posts.push(post);
            });

            //Sort by date.
            posts.sort(function(a, b) {
                return b.postedOn - a.postedOn;
            });

            //Increase exponent to more strongly prefer replying to newer posts.
            let random = Math.pow(Math.random(), 3.0);
            let post = posts[Math.floor(random*posts.length)];

            let reply = {
                title: 'Fake Post',
                links: [{target: post._id}]
            };

            Meteor.call('insertPost', reply);
        }
    }
    
    //Compute default layout of posts.
    console.log('Laying out posts');
    
    Posts.find({}, {fields: {'_id': 1, 'links': 1}}).forEach(function(post) {
        post.layer = 0;
        post.column = 0;
        console.log(post);
        Posts.update({_id: post._id},
                    {$set: {defaultPosition: {x:-1, y:3}}});
    });
    
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
        return Roles.addUsersToRoles(moderatorId, ['moderator']);
    }
});
