/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: GPL, Check file LICENSE
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
});
