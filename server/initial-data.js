Meteor.startup(function() {
    var moderatorEmail, moderatorId;
    if (!Post.findOne({isRoot: true})) {
        console.log("Adding root post");
        Post.insert({
            title: 'Forum Root',
            links: []
        });
    }
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
