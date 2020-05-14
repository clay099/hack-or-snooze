$(async function () {
    // cache some selectors we'll be using quite a bit
    const $allStoriesList = $("#all-articles-list");
    const $submitForm = $("#submit-form");
    const $filteredArticles = $("#filtered-articles");
    const $loginForm = $("#login-form");
    const $navNewArticle = $("#nav-new-article");
    const $navFavorites = $("#nav-favorites");
    const $navMyStories = $("#nav-my-stories");
    const $newArticle = $("#new-article-form");
    const $createAccountForm = $("#create-account-form");
    const $ownStories = $("#my-articles");
    const $navLogin = $("#nav-login");
    const $navLogOut = $("#nav-logout");

    // global storyList variable
    let storyList = null;

    // global currentUser variable
    let currentUser = null;

    // global favorites variable
    // let favorites = new Set();
    let favorites = [];

    await checkIfLoggedIn();

    /**
     * Event listener for logging in.
     *  If successfully we will setup the user instance
     */

    $loginForm.on("submit", async function (evt) {
        evt.preventDefault(); // no page-refresh on submit

        // grab the username and password
        const username = $("#login-username").val();
        const password = $("#login-password").val();

        // call the login static method to build a user instance
        const userInstance = await User.login(username, password);
        // set the global user to the user instance
        currentUser = userInstance;
        syncCurrentUserToLocalStorage();
        uploadFavorites(currentUser.favorites);
        loginAndSubmitForm();
    });

    /**
     * Event listener for signing up.
     *  If successfully we will setup a new user instance
     */

    $newArticle.on("submit", async function (evt) {
        evt.preventDefault(); // no page refresh

        // grab the required fields
        const token = localStorage.getItem("token");
        const username = localStorage.getItem("username");
        const author = localStorage.getItem("name");
        const title = $("#new-title").val();
        const url = $("#new-url").val();

        let passedUser = { token, username, author };
        let passedStory = { title, url };

        const newStory = await StoryList.addStory(passedUser, passedStory);
        $("#new-title").val("");
        $("#new-url").val("");
        await generateStories();
        $newArticle.hide();
    });

    // event listener to toggle showing the create article form
    $navNewArticle.on("click", () => {
        if (currentUser) {
            $newArticle.toggle();
        }
    });

    $createAccountForm.on("submit", async function (evt) {
        evt.preventDefault(); // no page refresh

        // grab the required fields
        let name = $("#create-account-name").val();
        let username = $("#create-account-username").val();
        let password = $("#create-account-password").val();

        // call the create method, which calls the API and then builds a new user instance
        const newUser = await User.create(username, password, name);
        currentUser = newUser;
        syncCurrentUserToLocalStorage();
        loginAndSubmitForm();
    });

    /**
     * Log Out Functionality
     */

    $navLogOut.on("click", function () {
        // empty out local storage
        localStorage.clear();
        // refresh the page, clearing memory
        location.reload();
    });

    /**
     * Event Handler for Clicking Login
     */

    $navLogin.on("click", function () {
        // Show the Login and Create Account Forms
        $loginForm.slideToggle();
        $createAccountForm.slideToggle();
        $allStoriesList.toggle();
    });

    /**
     * Event handler for Navigation to Homepage
     */

    $("body").on("click", "#nav-all", async function () {
        hideElements();
        await generateStories();
        $allStoriesList.show();
    });

    /**
     * On page load, checks local storage to see if the user is already logged in.
     * Renders page information accordingly.
     */

    async function checkIfLoggedIn() {
        // let's see if we're logged in
        const token = localStorage.getItem("token");
        const username = localStorage.getItem("username");

        // if there is a token in localStorage, call User.getLoggedInUser
        //  to get an instance of User with the right details
        //  this is designed to run once, on page load
        currentUser = await User.getLoggedInUser(token, username);
        await generateStories();

        if (currentUser) {
            showNavForLoggedInUser();
            updateFavorites(currentUser.favorites);
        }
    }

    // funciton which runs a loop over a set returns the story id and adds it to the global variable favorites and updates the local storage
    function updateFavorites(updatedFavorites) {
        for (favorite of updatedFavorites) {
            // pushes ids to global variable
            favorites.push(favorite.storyId);
        }
        // updateds local storage
        syncUserFavoritesToLocalStorage();
    }

    /**
     * A rendering function to run to reset the forms and hide the login info
     */

    function loginAndSubmitForm() {
        // hide the forms for logging in and signing up
        $loginForm.hide();
        $createAccountForm.hide();

        // reset those forms
        $loginForm.trigger("reset");
        $createAccountForm.trigger("reset");

        // show the stories
        $allStoriesList.show();

        // update the navigation bar
        showNavForLoggedInUser();
    }

    /**
     * A rendering function to call the StoryList.getStories static method,
     *  which will generate a storyListInstance. Then render it.
     */

    async function generateStories() {
        // get an instance of StoryList
        const storyListInstance = await StoryList.getStories();
        // update our global variable
        storyList = storyListInstance;
        // empty out that part of the page
        $allStoriesList.empty();

        // loop through all of our stories and generate HTML for them
        for (let story of storyList.stories) {
            const result = generateStoryHTML(story);
            $allStoriesList.append(result);
        }
    }

    /**
     * A function to render HTML for an individual Story instance
     */

    function generateStoryHTML(story) {
        let hostName = getHostName(story.url);

        // render story markup
        const storyMarkup = $(`
      <li id="${story.storyId}">
        <span class="fav"><i class="far fa-star"></i></span>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);

        return storyMarkup;
    }

    /* hide all elements in elementsArr */

    function hideElements() {
        const elementsArr = [
            $submitForm,
            $allStoriesList,
            $filteredArticles,
            $ownStories,
            $loginForm,
            $createAccountForm,
            $newArticle,
        ];
        elementsArr.forEach(($elem) => $elem.hide());
    }

    function showNavForLoggedInUser() {
        $navLogin.hide();
        $navLogOut.show();
        $navNewArticle.show();
        $navFavorites.show();
        $navMyStories.show();
    }

    /* simple function to pull the hostname from a URL */

    function getHostName(url) {
        let hostName;
        if (url.indexOf("://") > -1) {
            hostName = url.split("/")[2];
        } else {
            hostName = url.split("/")[0];
        }
        if (hostName.slice(0, 4) === "www.") {
            hostName = hostName.slice(4);
        }
        return hostName;
    }

    /* sync current user information to localStorage */

    function syncCurrentUserToLocalStorage() {
        if (currentUser) {
            localStorage.setItem("token", currentUser.loginToken);
            localStorage.setItem("username", currentUser.username);
            localStorage.setItem("name", currentUser.name);
        }
    }

    // click handle to check if click is on the star icon
    $(".articles-container").on("click", ".fav", async function (evt) {
        // gather elements to pass through
        let token = localStorage.getItem("token");
        let storyid = $(event.target).closest("li")[0].id;
        let username = localStorage.getItem("username");
        let currentFavorites = [];
        favorites = JSON.parse(localStorage.getItem("favorites"));

        // check if currentFavorites includes the clicked id - run the delete function
        if (favorites.includes(storyid)) {
            console.log(`remove ${storyid}`);
            // sets variable to be passed into upload Favorites function
            currentFavorites = new Set(await User.deleteFavorite(token, username, storyid));
            favoriteLoop(currentFavorites);
            // check if currentFavorites does not include the clicked id - run the add favorite function
        } else {
            console.log(`add ${storyid}`);
            // sets variable to be passed into upload Favorites function
            currentFavorites = new Set(await User.addFavorite(token, username, storyid));
            favoriteLoop(currentFavorites);
        }
    });

    // loops over the currentFavorites Set and returns and Array of ID's
    function favoriteLoop(currentFavorites) {
        favorites = [];
        for (favorite of currentFavorites) {
            // pushes ids to global variable
            favorites.push(favorite.storyId);
        }
        syncUserFavoritesToLocalStorage();
    }

    // funciton to save favorites array to local storage
    function syncUserFavoritesToLocalStorage() {
        if (favorites) {
            // stringify the array & save to local storage
            localStorage.setItem("favorites", JSON.stringify(favorites));
        }
    }
});
