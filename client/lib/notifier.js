//Basic callback class, for untangling asynchronous problems.
Notifier = function(firstAction) {
    let self = this;
    let actions = [];
    let fulfilled = false;
    
    //Executes the given function when this notifier is fulfilled.
    this.onFulfilled = function(action) {
        switch (typeof action) {
            case 'function': actions.push(action);
            case 'undefined': break;
            default: throw new TypeError(action + ' is not a function');
        }
        return self;
    };
    
    //Fulfills this notifier, executing any callbacks registered with it.
    this.fulfill = function() {
        if (!fulfilled) {
            for (let action of actions) {
                action.apply(null, arguments);
            }
            fulfilled = true;
        }
        return self;
    };
    
    //Makes this notifier fulfill when the given notifier fulfills.
    this.refer = function(notifier) {
        notifier.onFulfilled(function() {
            self.fulfill.apply(null, arguments);
        });
        return self;
    };
    
    //Returns whether this notifier has been fulfilled.
    this.isFulfilled = function() {
        return fulfilled;
    };
    
    this.onFulfilled(firstAction);
};

//Creates a notifier which will be fulfilled after all of the given notifiers
//are fulfilled.
Notifier.all = function() {
    let out = new Notifier();
    
    let counter = arguments.length;
    if (counter === 0) {
        out.fulfill();
    }
    
    for (let notifier of arguments) {
        notifier.refer(out);
        notifier.onFulfilled(function() {
            if (--counter === 0) {
                out.fulfill();
            }
        });
    }
    
    return out;
};
