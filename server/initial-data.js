/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: GPL, Check file LICENSE
*/

Meteor.startup(function() {
    let DEBUG_RESET = false; //Deletes all posts and add a set of random fake posts.
    
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
        
        let posts = [];
        
        let observer = Posts.find({}, {fields: {'_id': 1, 'postedOn': 1}}).observe({
            added: function(post) {
                posts.push(post);
            }
        });
        
        for (let i=0; i<15000; i++) {
            //Decrease exponent to more strongly prefer replying to newer posts.
            let random = Math.pow(Math.random(), 0.1);
            let post = posts[Math.floor(random*posts.length)];
            
            let reply = {
                title: 'Fake Post',
                links: [{target: post._id}]
            };
            
            if (Math.random() > 0.5) {
                reply.content = 'Fake content.';
            }

            Meteor.call('insertPost', reply);
        }
        
        observer.stop();
    }
    
    //Compute default layout of posts.
    console.log('Laying out posts');
    let posts = {};
    Posts.find({}, {fields: {'_id': 1, 'links': 1}}).forEach(function(post) {
        posts[post._id] = post;
    });
    
    let grapher = new LayeredGrapher(posts);
    
    for (let id in posts) {
        let post = posts[id];
        Posts.update({_id: id},
                    {$set: {defaultPosition: {x:post.x, y:post.y}}});
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
        return Roles.addUsersToRoles(moderatorId, ['moderator']);
    }
});
