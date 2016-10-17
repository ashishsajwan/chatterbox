/**
 * This is a backbone model which store
 * the friend's entity
 */
var FriendModel = Backbone.Model.extend({
  initialize: function() {}
});

/**
 * This is a backbone collection which store
 * the list of friends as collection
 */
var FriendsList = Backbone.Collection.extend({
  currentFriend: null,
  chatHistory: [], // keeps history for current chat
  model: FriendModel,
  url: 'data/friends.json',
  saveChat: function() {
    /**
     * save only when we have currentFriend Id - this prevents saving null
     * when opening a chat first time
     */

    if (this.currentFriend) {
      localStorage.setItem('CH-' + this.currentFriend, JSON.stringify(this.chatHistory));
      this.chatHistory = [];
    }
  },
  loadChat: function() {
    this.chatHistory = JSON.parse(localStorage.getItem('CH-' + this.currentFriend)) || [];
  }
});

/**
 * This is a backbone view which is responsible
 * for rendering Header of the app
 */
var HeaderView = Backbone.View.extend({
  className: 'row valign-wrapper',
  initialize: function() {
    this.render();
  },
  render: function() {
    var headerTemplate = _.template($('#Tpl-header').html());
    this.$el.html(headerTemplate);
    $('#app-header-container').html(this.el);
  }
});
/**
 * This is a backbone view which is responsible
 * for rendering Friends list, and chat column
 */
var BodyView = Backbone.View.extend({
  className: 'row',
  wsUri: "wss://echo.websocket.org/",
  websocket: null,
  events: {
    'enter #search-friends': 'searchFriends',
    'click #friends-list .friend': 'loadFriendChat',
    'enter #send-msg': 'sendMessage',
    'click #send-btn': 'sendMessage'
  },
  initialize: function() {
    // listen to sync event on collection and then render the firneds list
    this.listenTo(this.collection, 'sync', this.renderFriendsList);
    this.render();
    this.collection.fetch();
  },
  //this is where we render the containers
  render: function() {
    this.$el.html(_.template($('#Tpl-body').html()));
    $('#app-body-container').html(this.el);
  },
  searchFriends: function(e) {
    var searchTerm = $(e.currentTarget).val().toLowerCase();
    this.renderFriendsList(_.filter(this.collection.models, function(model) {
      var name = model.get('name');
      name = name.first + ' ' + name.last;
      return (name.toLowerCase().indexOf(searchTerm) != -1);
    }));
  },
  // render the log list
  renderFriendsList: function(friendsList) {
    var friendsList = _.isArray(friendsList) ? friendsList : friendsList.models;
    var friendTemplate = _.template($('#Tpl-friend').html());
    $('#friends-list').empty();
    // render list if collection has some models

    _.each(friendsList, function(model) {
      $('#friends-list').append(friendTemplate(model.toJSON()));
    });
  },
  loadFriendChat: function(e) {
    var that = this;
    // lets save the chat done with this friend, before we switch to another friend
    this.collection.saveChat();

    var friendId = $(e.currentTarget).attr('data-friendid');
    // set the id of this friend as currentFriend
    this.collection.currentFriend = friendId;

    //load the chat with this friend
    this.collection.loadChat();

    var chatTemplate = _.template($('#Tpl-chat').html());
    $('#chat-container').html(chatTemplate(this.collection.get(friendId).toJSON()));

    // put chat history aswell
    _.each(this.collection.chatHistory, function(data, key) {
      that.writeMessage(data);
    });
  },
  sendMessage: function() {
    if (this.collection.currentFriend && $('#send-msg').val()) {
      var message = $('#send-msg').val();
      var data = [{
        message: message,
        mine: true // mine coz sent by me
      }];
      this.collection.chatHistory.push(data);
      this.writeMessage(data);
      $('#send-msg').val('');
      websocket.send(message);
    }
  },
  writeMessage: function(data) {
    var messageTemplate = _.template($('#Tpl-message').html());
    $('#chat-box').prepend(messageTemplate({
      data: data
    }));
  },
  socketOpen: function(e) {
    console.log('connected', e);
  },
  socketClose: function(e) {
    console.log('Closed', e);
  },
  socketMessage: function(e) {
    var data = [{
      message: e.data,
      mine: false // mine false coz i didn't send this
    }];
    this.collection.chatHistory.push(data);
    this.writeMessage(data)
  },
  socketError: function(e) {
    console.log('ERROR', e);
  }
})

$(document).ready(function() {
  // capturing enter key on inputs and firing enter event
  // so that pressing enter of msg box works
  $('#app-body-container').on('keyup', '#send-msg,#search-friends', function(e) {
    if (e.keyCode == 13) {
      $(this).trigger('enter');
    }
  });

  var friendsList = new FriendsList();

  // create a object of Headerview
  // which will render header view of app
  var headerView = new HeaderView();

  var bodyView = new BodyView({
    collection: friendsList
  });

  websocket = new WebSocket(bodyView.wsUri);

  websocket.onopen = function(e) {
    bodyView.socketOpen(e);
  };
  websocket.onclose = function(e) {
    bodyView.socketClose(e);
  }
  websocket.onmessage = function(e) {
    _.delay(function() {
      bodyView.socketMessage(e);
    }, 1500);
  }
  websocket.onerror = function(e) {
    bodyView.socketError(e);
  }

});
