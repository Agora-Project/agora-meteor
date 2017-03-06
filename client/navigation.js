/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: GPL, Check file LICENSE
*/

Accounts.onLogin = function() {
    user = Meteor.user()
    if(user.isBanned) {
        //Logout on login
        Meteor.users.update({_id: user._id}, {$set : { "services.resume.loginTokens" : [] }})
    }
};
