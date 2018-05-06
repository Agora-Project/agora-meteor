/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: AGPL-3.0, Check file LICENSE
*/
if(Meteor.isServer) {

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
        },
        userExists: function(preferredUsername) {
            return Meteor.users.findOne({'profile.preferredUsername': preferredUsername}) ? true : false;
        }
    })

    Meteor.users.before.insert(function(userId, user) {
        if (!user.profile) user.profile = {};

        user.profile.name = user.username;
        user.profile.preferredUsername = user.username;
        delete user.username;

        user.profile.email_hash = Avatar.hash(user.emails[0].address);
        user.profile.summary = "Empty user summary.";
        user.seenPosts = [];

        console.log(user);
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

}

AccountsTemplates.addField({
    _id: 'username',
    displayName: 'Account Username (Unchangeable)',
    type: 'text',
    required: true,
    func: function(value) {
        if (Meteor.isClient) {
            console.log("Validating username...");
            var self = this;
            Meteor.call("userExists", value, function(err, userExists) {
            console.log(userExists);
                if (!userExists)
                    self.setSuccess();
                else
                    self.setError("User Exists!");
                self.setValidating(false);
            });
        }

        // Server
        return Meteor.call("userExists", value);
    }
});

AccountsTemplates.configure({
  confirmPassword: true,
  enablePasswordChange: true,
  forbidClientAccountCreation: false,
  overrideLoginErrors: true,
  sendVerificationEmail: true,
  lowercaseUsername: false,
  showAddRemoveServices: false,
  showForgotPasswordLink: true,
  showLabels: true,
  showPlaceholders: true,
  showResendVerificationEmailLink: true,
  continuousValidation: false,
  negativeFeedback: false,
  negativeValidation: true,
  positiveValidation: true,
  positiveFeedback: true,
  showValidating: true,
  homeRoutePath: '/',
  redirectTimeout: 4000
});

AccountsTemplates.configureRoute('signIn');

AccountsTemplates.configureRoute('changePwd');

AccountsTemplates.configureRoute('signUp', {
  name: 'join',
  path: '/join'
});

AccountsTemplates.configureRoute('forgotPwd');

AccountsTemplates.configureRoute('resetPwd', {
  name: 'resetPwd',
  path: '/reset-password'
});

AccountsTemplates.configureRoute('verifyEmail');
