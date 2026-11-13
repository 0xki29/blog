---
layout: page
title: Tags
---

<section id="tag-cloud" class="chips" aria-label="Filter by tag">
{% assign all_tags = "" | split: "" %}
{% for post in site.posts %}{% for t in post.tags %}{% unless all_tags contains t %}{% assign all_tags = all_tags | push: t %}{% endunless %}{% endfor %}{% endfor %}
{% assign all_tags = all_tags | sort %}
{% for t in all_tags %}
  {% assign count = 0 %}{% for post in site.posts %}{% if post.tags contains t %}{% assign count = count | plus: 1 %}{% endif %}{% endfor %}
  <button class="chip" type="button" data-tag="{{ t | slugify }}">{{ t }} <i>{{ count }}</i></button>
{% endfor %}
</section>

<input id="tag-filter" class="tag-filter" type="search" placeholder="[ filter posts ]" aria-label="Filter posts by keyword">
<div class="empty-state" id="tag-empty" hidden>[ no records match ]</div>

{% for t in all_tags %}
<section class="tag-group" id="{{ t | slugify }}" data-tag="{{ t | slugify }}">
  <h3 class="tag-h"># {{ t }}</h3>
  <ul class="post-list">
  {% for post in site.posts %}
    {% if post.tags contains t %}
    <li class="arch-item" data-text="{{ post.title | downcase | escape }} {{ t | downcase | escape }}">
      <time>{{ post.date | date: "%Y-%m-%d" }}</time>
      <a href="{{ post.url | prepend: site.baseurl | replace: '//', '/' }}">{{ post.title }}</a>
    </li>
    {% endif %}
  {% endfor %}
  </ul>
</section>
{% endfor %}
