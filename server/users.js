/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: AGPL-3.0, Check file LICENSE
*/

Meteor.methods({
    switchBanned: function (targetUserId, isBanned) {
        var loggedInUser = Meteor.user();

        if (!loggedInUser || !Roles.userIsInRole(loggedInUser, ['moderator'])) {
            throw new Meteor.Error(403, "Access denied");
        }

        Meteor.users.update(targetUserId, {
            $set: {isBanned: isBanned}
        });
        if (isBanned) {
            //Immediately logout user
            Meteor.users.update({_id: targetUserId}, {$set : { "services.resume.loginTokens" : [] }})
        }
    },
    switchModerator: function (targetUserId, isModerator) {
        var loggedInUser = Meteor.user();

        if (!loggedInUser || !Roles.userIsInRole(loggedInUser, ['moderator'])) {
            throw new Meteor.Error(403, "Access denied");
        }

        if (isModerator) {
            Roles.addUsersToRoles(targetUserId, ['moderator']);
        } else {
            Roles.removeUsersFromRoles(targetUserId, ['moderator']);
        }
    }
})

Meteor.users.before.insert(function(userId, user) {
    user.email_hash = Avatar.hash(user.emails[0].address);
    user.bio = "Empty user bio";
    user.seenPosts = [];
});

Meteor.setInterval(function() { //Remove posts that are older than 30 days fro  a users list of seen posts. Those posts are automatically seen.

    Meteor.users.find({}).fetch().forEach(function(user) {
        if (user.seenPosts) {
            user.seenPosts.forEach(function(postID) {
                let post = Posts.findOne({_id: postID});
                if (Date.now() - post.postedOn >= (1000*60*60*24*30))
                    Meteor.users.update({_id: user._id}, {$pull: {seenPosts: postID}});
            })
        }
    })

}, 1000*60*60*24); //run function every day.
