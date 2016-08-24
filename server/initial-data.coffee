Meteor.startup ->
  if (!Post.findOne({isRoot: true}))
    console.log("Adding root post")
    Post.insert(title: 'Forum', body: "This post is the root of the forum.", isRoot: true);
  moderatorEmail = "moderator@example.com";
  if (!Meteor.users.findOne("emails.address" : moderatorEmail))
    console.log("Adding default moderator")
    moderatorId = Accounts.createUser
      email: moderatorEmail,
      password: "mod1pass",
      profile:
        name: "Moderator"
    Roles.addUsersToRoles(moderatorId, ['moderator'])
