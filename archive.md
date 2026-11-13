---
layout: page
title: Archive
---

<input id="tag-filter" class="tag-filter" type="search" placeholder="[ filter records ]" aria-label="Filter posts by keyword">
<div class="empty-state" id="tag-empty" hidden>[ no records match ]</div>

{% if site.posts[0] %}
  {% capture currentyear %}{{ 'now' | date: "%Y" }}{% endcapture %}
  {% capture firstpostyear %}{{ site.posts[0].date | date: '%Y' }}{% endcapture %}
  <section class="arch-year">
    <h3>{% if currentyear == firstpostyear %}This year's posts{% else %}{{ firstpostyear }}{% endif %}</h3>
    <ul>
    {% for post in site.posts %}
      <li class="arch-item" data-text="{{ post.title | downcase | escape }}{% for t in post.tags %} {{ t | downcase | escape }}{% endfor %}{% for c in post.categories %} {{ c | downcase | escape }}{% endfor %}">
        <time>{{ post.date | date:"%d %b" }}</time>
        <a href="{{ post.url | prepend: site.baseurl | replace: '//', '/' }}">{{ post.title }}</a>
        <span class="tags-mini">{% for t in post.tags %}<i>{{ t }}</i>{% endfor %}</span>
      </li>
      {% if post.next %}
        {% capture year %}{{ post.date | date: '%Y' }}{% endcapture %}
        {% capture nyear %}{{ post.next.date | date: '%Y' }}{% endcapture %}
        {% if year != nyear %}
    </ul>
  </section>
  <section class="arch-year">
    <h3>{{ nyear }}</h3>
    <ul>
        {% endif %}
      {% endif %}
    {% endfor %}
    </ul>
  </section>
{% endif %}
