Template.forumUsers.helpers({
    userList: Meteor.users.find({})
});

Template.userItem.events({
    'change .change-moderator': function () {
        Meteor.call('switchModerator', this._id, !Roles.userIsInRole(this._id, ['moderator']));
    },
    'click .change-banned': function () {
        Meteor.call('switchBanned', this._id, !this.isBanned);
    }
});

Template.userItem.helpers({
    disabledIfMe: function() {
        if (this._id === Meteor.userId()) {
            return 'disabled';
        }
        return '';
    },
    checkedIfModerator: function(prefix) {
        if (Roles.userIsInRole(this._id, ['moderator'])) {
            return prefix + 'checked';
        }
        return '';
    },
    checkedIfBanned: function(prefix) {
        if (this.isBanned) {
            return prefix + 'checked';
        }
        return '';
    },
    createdAtFormatted: function (date) {
        return moment(date).format('LLL');
    },
    defaultEmail: function () {
        if (this.emails && this.emails.length)
            return this.emails[0].address;

    		if (this.services) {
      			//Iterate through services
      			for (var serviceName in this.services) {
        				var serviceObject = this.services[serviceName];
        				//If an 'id' isset then assume valid service
        				if (serviceObject.id) {
          					if (serviceObject.email) {
            						return serviceObject.email;
          					}
        				}
      			}
    		}
    		return "";
    }
});
