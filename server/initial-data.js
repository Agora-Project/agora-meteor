/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: GPL, Check file LICENSE
*/

Meteor.startup(function() {
    var moderatorEmail, moderatorId;
    if (!Post.findOne({$where : '!this.links || this.links.length < 1'})) {
        console.log("Adding root post");
        Post.insert({
            title: 'Forum Root',
            links: []
        });

    }

    /*
    console.log("Adding fake posts");
    for (let i=0; i<128; i++) {
        let posts = [];
        Post.find().forEach(function(post) {
            posts.push(post);
        });

        //Sort by date.
        posts.sort(function(a, b) {
            return b.postedOn - a.postedOn;
        });

        //Increase exponent to more strongly prefer replying to newer posts.
        let random = Math.pow(Math.random(), 0.25);
        let post = posts[Math.floor(random*posts.length)];

        let reply = {
            title: 'Fake Post',
            links: [{target: post._id}]
        };

        Meteor.call('insertPost', reply);
    }*/

    moderatorEmail = "moderator@example.com";
    if (!Meteor.users.findOne({
        "emails.address": moderatorEmail
    })) {
        console.log("Adding default moderator");
        moderatorId = Accounts.createUser({
            email: moderatorEmail,
            password: "mod1pass",
            username: "Moderator"
        });
        return Roles.addUsersToRoles(moderatorId, ['moderator']);
    }
});
