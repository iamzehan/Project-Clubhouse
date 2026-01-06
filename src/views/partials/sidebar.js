<aside class="sidebar">
  <nav class="side-nav">
    <ul class="nav-list">
    <li className="nav-item">
        <a href="/" class="nav-link user">
          <div class="profile"><i class="mi">person</i></div>
          <span><%= currentUser.username %></span>
        </a>
    </li>
      <li class="nav-item">
        <a href="/messages/create" class="nav-link">
          <i class="mi">add_comment</i>
          <span>Create Message</span>
        </a>
      </li>

      <li class="nav-item">
        <a href="/clubs" class="nav-link">
          <i class="mi">groups</i>
          <span>Clubs</span>
        </a>
      </li>

      <li class="nav-item logout">
        <a href="/logout" class="nav-link">
          <i class="mi">logout</i>
          <span>Logout</span>
        </a>
      </li>
    </ul>
  </nav>
</aside>
