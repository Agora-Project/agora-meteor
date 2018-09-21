Migrations.add({
    version: 2,
    name: 'Add host data to Actors',
    up: function() {

        let actors = Actors.find({}).forEach(function(actor) {
            let url = actor.id;

            var host;
            //find & remove protocol (http, ftp, etc.) and get hostname

            if (url.indexOf("//") > -1) {
                host = url.split('/')[2];
            }
            else {
                host = url.split('/')[0];
            }

            //find & remove "?"
            host = host.split('?')[0];
            actor.host = host;
            Actors.update({id: actor.id}, actor);
        });
    },
    down: function() {}
});

Migrations.add({
    version: 1,
    name: 'Add support for activityPub',
    up: function() {
        let users = Meteor.users.find({}).fetch();

        for (let user of users) {
            if (!user.actor) {

                let id = process.env.ROOT_URL + "actors/" + user.username;
                let actor = {
                    preferredUsername: user.username,
                    name: user.username,
                    type: "Person",
                    id: id,
                    url: process.env.ROOT_URL + "@" + user.username,
                    inbox: id + "/inbox",
                    outbox: id + "/outbox",
                    followers: id + "/followers",
                    following: id + "/following",
                    summary: "Empty user summary.",
                    local: true
                };

                if (Actors.insert(actor)) user.actor = id;
            }
        }

        let posts = Posts.find({}).fetch();

        for (let post of posts) {
            Posts.remove({_id: post._id});

            post.attributedTo = Meteor.users.find({_id: post.poster}).actor;

            delete post.poster;

            let actor = Actors.findOne({id: post.attributedTo});
            post.id = process.env.ROOT_URL + "post/" + post._id;
            post.url = actor.url + "/" + post._id;

            let newReplies = [];

            for (let reply_id of post.replies) {
                newReplies.push(process.env.ROOT_URL + "post/" + reply_id);
            }

            post.replies = newReplies;

            post.inReplyTo = process.env.ROOT_URL + "post/" + post.target;

            delete post.target;

            if (post.title) post.summary = post.title;

            delete post.title;

            post.update({_id: post._id}, post);
        }
    },
    down: function() {}
});

Meteor.startup(() => {
    Migrations.migrateTo('latest');
});
