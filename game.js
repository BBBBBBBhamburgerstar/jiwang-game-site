// 《既往》玩家端：单人模式
(function () {
  const D = window.JW;
  const $ = (s) => document.querySelector(s);
  const SAVE = "jiwang-save-v1";
  const ACT_NAMES = ["", "第一幕", "第二幕", "第三幕", "第四幕", "第五幕", "第六幕", "第七幕", "第八幕", "第九幕", "第十幕"];

  let st = null;      // { role, act, pos, vars, c: {题号: 选项}, log: [] }
  let blocks = [];    // 当前幕解析后的内容块
  const shared = {};  // 共享小剧场文本

  // ───────── 存档 ─────────
  const save = () => { try { localStorage.setItem(SAVE, JSON.stringify(st)); } catch (e) {} };
  const load = () => { try { return JSON.parse(localStorage.getItem(SAVE) || "null"); } catch (e) { return null; } };
  const clear = () => { try { localStorage.removeItem(SAVE); } catch (e) {} };

  // ───────── 页面切换 ─────────
  function show(id) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("on", s.id === id));
    window.scrollTo(0, 0);
  }
  document.addEventListener("click", (e) => {
    const go = e.target.closest("[data-go]");
    if (go) show(go.dataset.go);
  });

  // ───────── 文本格式 ─────────
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fmt = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/__(.+?)__/g, "<u>$1</u>").replace(/~~(.+?)~~/g, "<s>$1</s>").replace(/█+/g, (m) => `<span class="ink">${m}</span>`);

  // 把剧本文本切成块
  function parse(txt) {
    const lines = txt.replace(/\r/g, "").split("\n");
    const out = [];
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (!l.trim()) continue;
      if (!l.startsWith("@")) { out.push({ t: "p", text: l }); continue; }
      const [cmd, ...rest] = l.slice(1).split(" ");
      const arg = rest.join(" ");
      const parts = arg.split("|");
      const collect = (stop) => {
        const body = [];
        while (i + 1 < lines.length && !stop(lines[i + 1])) body.push(lines[++i]);
        return body;
      };
      switch (cmd) {
        case "poem": out.push({ t: "poem", lines: collect((x) => !x.trim()) }); break;
        case "sign": out.push({ t: "sign", a: parts[0], b: parts[1] || "" }); break;
        case "act": out.push({ t: "act", title: parts[0], v: parts.slice(1) }); break;
        case "big": out.push({ t: "big", lines: parts }); break;
        case "redact": out.push({ t: "redact", lines: parts }); break;
        case "glitch": out.push({ t: "glitch", lines: parts }); break;
        case "glitch2": out.push({ t: "glitch2", lines: parts }); break;
        case "choice": out.push({ t: "choice", id: arg.trim() }); break;
        case "room": out.push({ t: "room", id: parts[0], l1: parts[1], l2: parts[2] }); break;
        case "know": case "task": case "panel": out.push({ t: cmd, title: arg, lines: collect((x) => !x.trim()) }); break;
        case "scene": out.push({ t: "scene", title: arg, lines: collect((x) => x.startsWith("@end")) }); i++; break;
        case "shared": out.push({ t: "shared", id: arg.trim() }); break;
      }
    }
    return out;
  }

  // ───────── 渲染 ─────────
  const book = () => $("#book");

  function renderBlock(b, animate) {
    const el = document.createElement("div");
    if (animate) el.className = "fade";
    switch (b.t) {
      case "p": {
        const p = document.createElement("p");
        p.innerHTML = fmt(b.text);
        if (/^[“「（]/.test(b.text)) p.className = "lead";
        if (animate) p.className += " fade";
        return p;
      }
      case "poem":
        el.className += " poemblock";
        el.innerHTML = `<img class="ghost" src="assets/logo/title.png" alt="">` + b.lines.map((l) => `<div>${fmt(l)}</div>`).join("");
        return el;
      case "sign":
        el.className += " signblock";
        el.innerHTML = `<span class="a">${fmt(b.a)}</span>${b.b ? `<span class="b">${fmt(b.b)}</span>` : ""}`;
        return el;
      case "act":
        el.className += " actblock";
        el.innerHTML = `<div>${b.v.map((v) => `<div class="v">${esc(v)}</div>`).join("")}</div><div class="t">${esc(b.title)}</div><img src="assets/misc/dandelion.png" alt="">`;
        return el;
      case "redact":
        el.className += " redact";
        el.innerHTML = b.lines.map((l) => `<p><s>${fmt(l)}</s></p>`).join("") + `<div class="bars"><i style="width:92%"></i><i style="width:58%"></i><i style="width:40%"></i><i style="width:96%"></i></div>`;
        return el;
      case "glitch":
        el.className += " glitch";
        el.innerHTML = b.lines.map((l, i) => `<div style="font-size:${14 + i * 3}px;text-align:${["left", "center", "right"][i % 3]}">${fmt(l)}</div>`).join("");
        return el;
      case "glitch2": {
        el.className += " glitch2";
        const chars = "风清砚".split("");
        let shards = "";
        for (let i = 0; i < 46; i++) shards += `<span style="left:${(i * 37) % 96}%;top:${(i * 53) % 92}%;font-size:${12 + (i * 7) % 26}px;transform:rotate(${(i * 29) % 50 - 25}deg);opacity:${0.25 + ((i * 13) % 60) / 100}">${chars[i % 3]}</span>`;
        el.innerHTML = `<div class="shards">${shards}</div><div class="core">${b.lines.map(fmt).join("<br>")}</div>`;
        return el;
      }
      case "big":
        el.className += " bigblock";
        el.innerHTML = b.lines.map(fmt).join("<br>");
        return el;
      case "know": case "task": case "panel":
        el.className += " page " + b.t;
        el.innerHTML = `<h4>${esc(b.title)}</h4>` + b.lines.map((l) =>
          `<div class="${/^（.）/.test(l) ? "h" : ""}">${fmt(l)}</div>`).join("");
        return el;
      case "scene":
        el.className += " scene";
        el.innerHTML = `<h4>${esc(b.title)}</h4>` + b.lines.map((l) =>
          l.startsWith("!") ? `<p class="mine">${fmt(l.slice(1).replace(/^[^：]+：/, ""))}</p>` : `<p>${fmt(l)}</p>`).join("");
        return el;
      case "shared": {
        el.className += " scene";
        const lines = (shared[b.id] || "").split("\n").filter((l) => l.trim());
        el.innerHTML = `<h4>小剧场</h4>` + lines.map((l) => {
          const m = l.match(/^([^：“]{1,6})(皱眉|立刻转身)?：(.*)$/);
          if (!m) return `<p>${fmt(l)}</p>`;
          const who = m[1], line = m[3];
          if (who === st.role) return `<p class="mine">${fmt(line)}</p>`;
          return `<p><span class="who">${esc(who)}${m[2] ? esc(m[2]) : ""}</span>${fmt(line)}</p>`;
        }).join("");
        return el;
      }
    }
    return el;
  }

  // 从 st.pos 开始，一直渲染到下一个需要玩家操作的块
  function advance(animate = true) {
    while (st.pos < blocks.length) {
      const b = blocks[st.pos];
      if (b.t === "act") $("#rdAct").textContent = b.title;
      if (b.t === "choice") { renderChoice(D.choices[b.id], b.id, book(), () => { st.pos++; save(); advance(); }); return; }
      if (b.t === "room") { renderRoomGate(b); return; }
      book().appendChild(renderBlock(b, animate));
      st.pos++;
    }
    save();
    renderActEnd();
  }

  // 已经读过的部分直接铺出来（续读时）
  function replay() {
    book().innerHTML = "";
    const upto = st.pos;
    for (let i = 0; i < upto; i++) {
      const b = blocks[i];
      if (b.t === "act") $("#rdAct").textContent = b.title;
      if (b.t === "choice") { renderChoice(D.choices[b.id], b.id, book(), null, st.c[b.id]); continue; }
      if (b.t === "room") { const g = document.createElement("div"); g.className = "roomgate"; g.innerHTML = `<div class="l1">【${esc(b.l1)}】</div><div class="l2">已与${esc(D.rooms[b.id]?.npc || "")}相见</div>`; book().appendChild(g); continue; }
      book().appendChild(renderBlock(b, false));
    }
  }

  // ───────── 选择题 ─────────
  function applyEffects(o) {
    for (const [k, d] of Object.entries(o.effects || {})) st.vars[k] = (st.vars[k] || 0) + d;
  }

  function renderChoice(q, id, host, onDone, already) {
    const box = document.createElement("div");
    box.className = "choice fade";
    box.innerHTML = (q.prompt ? `<div class="q">${fmt(q.prompt)}</div>` : "") + `<div class="opts"></div><div class="hint"></div>`;
    const opts = box.querySelector(".opts"), hint = box.querySelector(".hint");
    const lock = (picked) => opts.querySelectorAll(".opt").forEach((b) => { b.disabled = true; b.classList.toggle("picked", b.dataset.id === picked); });
    q.options.forEach((o) => {
      const b = document.createElement("button");
      b.className = "opt"; b.dataset.id = o.id; b.textContent = o.label;
      b.onclick = () => {
        if (o.rewind) {
          hint.textContent = D.hint.rewind; hint.className = "hint warn";
          b.disabled = true;
          st.log.push({ id, pick: o.id, label: o.label, rewind: true });
          save();
          return;
        }
        lock(o.id);
        st.c[id] = o.id; applyEffects(o);
        st.log.push({ id, pick: o.id, label: o.label, canon: !!o.canon, canonLabel: q.options.find((x) => x.canon)?.label });
        if (!o.canon) { hint.textContent = D.hint.echo; hint.className = "hint"; }
        save();
        if (onDone) setTimeout(onDone, o.canon ? 300 : 1100);
      };
      opts.appendChild(b);
    });
    if (already) { lock(already); const o = q.options.find((x) => x.id === already); if (o && !o.canon) hint.textContent = D.hint.echo; }
    host.appendChild(box);
    return box;
  }

  // ───────── 小黑屋 ─────────
  function renderRoomGate(b) {
    const g = document.createElement("div");
    g.className = "roomgate fade";
    g.innerHTML = `<div class="l1">【${esc(b.l1)}】</div><button class="btn seal-btn">起身出门</button><div class="l2">${esc(b.l2 || "")}</div>`;
    g.querySelector("button").onclick = () => {
      const chain = (id, done) => openRoom(id, () => { const nx = D.rooms[id].then; nx ? chain(nx, done) : done(); });
      chain(b.id, () => {
        g.innerHTML = `<div class="l1">【${esc(b.l1)}】</div><div class="l2">已与${esc(D.rooms[b.id]?.npc || "")}相见</div>`;
        st.pos++; save(); advance();
      });
    };
    book().appendChild(g);
  }

  function openRoom(id, onLeave) {
    const R = D.rooms[id];
    $("#rTitle").textContent = R.title;
    $("#rNpc").textContent = R.npc;
    $("#rImg").src = `assets/npc/${R.img || "云笙"}.jpg`;
    $("#room").classList.toggle("day", !!R.day);
    $("#room").style.setProperty("--npc", `"${R.npc}"`);
    const log = $("#rlog"), ctl = $("#rctl");
    log.innerHTML = ""; ctl.innerHTML = "";
    $("#room").classList.add("on"); $("#room").scrollTop = 0;
    document.body.style.overflow = "hidden";
    let i = 0;
    const ok = (s) => !s.only || Function("c", `return (${s.only});`)(st.c);
    const scrollEnd = () => setTimeout(() => $("#room").scrollTo({ top: $("#room").scrollHeight, behavior: "smooth" }), 40);

    function next() {
      ctl.innerHTML = "";
      while (i < R.steps.length && !ok(R.steps[i])) i++;
      if (i >= R.steps.length) {
        ctl.innerHTML = `<div class="leave"><button class="btn">回到主房间</button></div>`;
        ctl.querySelector("button").onclick = () => { $("#room").classList.remove("on"); document.body.style.overflow = ""; onLeave(); };
        scrollEnd();
        return;
      }
      const s = R.steps[i++];
      if (s.say || s.stage || s.item || s.letter) {
        const el = document.createElement("div");
        el.className = "fade " + (s.say ? "say" : s.stage ? "stage" : s.letter ? "letter" : "item");
        el.innerHTML = s.say ? fmt(s.say) : s.stage ? fmt(s.stage)
          : s.letter ? s.letter.map((l) => `<p>${fmt(l)}</p>`).join("")
          : `获得道具 · ${esc(s.item)}<small>${esc(s.desc || "")}</small>`;
        log.appendChild(el);
        if (s.item) st.items = [...new Set([...(st.items || []), s.item])];
        // 下一步若需要玩家回应，直接显示；否则点一下继续
        const peek = R.steps.slice(i).find(ok);
        if (peek && (peek.ask || peek.choice)) next();
        else { ctl.innerHTML = `<button class="tap">· 轻触继续 ·</button>`; ctl.querySelector("button").onclick = next; }
        scrollEnd();
        return;
      }
      if (s.ask === "free") {
        ctl.innerHTML = `<div class="row"><input placeholder="${esc(s.placeholder || "")}" maxlength="80"><button class="send">说</button></div>${s.hint ? `<div class="err" style="color:var(--night-ink2)">${esc(s.hint)}</div>` : ""}<div class="err"></div>`;
        const input = ctl.querySelector("input"), err = ctl.querySelector(".err:last-child");
        const send = () => {
          const v = input.value.trim();
          if (!v) { err.textContent = "说点什么吧。"; return; }
          const me = document.createElement("div"); me.className = "me fade"; me.innerHTML = `<span>${esc(v)}</span>`;
          log.appendChild(me); next();
        };
        input.addEventListener("input", () => (err.textContent = ""));
        input.addEventListener("keydown", (e) => { if (e.key === "Enter") send(); });
        ctl.querySelector(".send").onclick = send;
        setTimeout(() => input.focus({ preventScroll: true }), 50);
        scrollEnd();
        return;
      }
      if (s.choice) {
        const id = s.choice;
        const wrap = document.createElement("div");
        ctl.appendChild(wrap);
        const hint = document.createElement("div"); hint.className = "err"; ctl.appendChild(hint);
        s.options.forEach((o) => {
          const b = document.createElement("button");
          b.className = "opt"; b.textContent = o.label;
          b.onclick = () => {
            if (o.rewind) {
              st.log.push({ id, pick: o.id, label: o.label, rewind: true });
              b.disabled = true; b.style.opacity = .35;
              hint.textContent = D.hint.rewind;
              save();
              return;
            }
            st.c[id] = o.id; applyEffects(o);
            st.log.push({ id, pick: o.id, label: o.label, canon: !!o.canon, canonLabel: s.options.find((x) => x.canon)?.label, room: true });
            save();
            const me = document.createElement("div"); me.className = "me fade"; me.innerHTML = `<span>${esc(o.label)}</span>`;
            log.appendChild(me);
            next();
          };
          wrap.appendChild(b);
        });
        scrollEnd();
      }
    }
    next();
  }

  // ───────── 幕末复盘 ─────────
  function renderActEnd() {
    const others = (D.others[st.act] || []).filter((o) => o.role !== st.role);
    const mine = st.log.filter((l) => !l.rewind);
    const diverged = mine.filter((l) => !l.canon).length;
    const rewinds = st.log.filter((l) => l.rewind).length;
    const el = document.createElement("div");
    el.className = "review fade";
    el.innerHTML = `
      <h3>${ACT_NAMES[st.act]} · 照心</h3>
      <div class="sub">这一幕，所有人的抉择</div>
      <div class="stats">
        <div class="stat"><b>${mine.length}</b><small>你的抉择</small></div>
        <div class="stat"><b>${diverged}</b><small>与原本不同</small></div>
        <div class="stat"><b>${rewinds}</b><small>被照心倒回</small></div>
      </div>
      ${mine.map((l) => `<div class="rv"><div class="who">${esc(st.role)}${l.room ? " · 小黑屋" : ""}</div>
        <div class="mine">${esc(l.label)}</div>
        ${l.canon ? "" : `<div class="canon">原本：${esc(l.canonLabel || "")}</div>`}</div>`).join("")}
      ${others.map((o) => `<div class="rv"><div class="who">${esc(o.role)}<span class="ai">托管</span></div>
        <div>${esc(o.q)}</div><div class="canon">选择：${esc(o.pick)}</div></div>`).join("")}
      <div class="go"><button class="btn" id="nextAct">第二幕 · 转录中</button></div>`;
    book().appendChild(el);
    el.querySelector("#nextAct").onclick = () => alert("第二幕正在从扫描本转录，下一版加入。");
  }

  // ───────── 剧本抽屉 ─────────
  function openDrawer() {
    const pages = blocks.slice(0, st.pos).filter((b) => b.t === "know" || b.t === "task");
    const body = $("#drawerBody");
    body.innerHTML = pages.length ? "" : `<p class="empty">读到任务页后，你的剧本会收在这里。</p>`;
    pages.forEach((b) => body.appendChild(renderBlock(b, false)));
    if (st.items && st.items.length) {
      const it = document.createElement("div"); it.className = "page";
      it.innerHTML = `<h4>道具</h4>` + st.items.map((x) => `<div>${esc(x)}</div>`).join("");
      body.appendChild(it);
    }
    $("#drawer").classList.add("on");
  }
  $("#openDrawer").onclick = openDrawer;
  $("#closeDrawer").onclick = () => $("#drawer").classList.remove("on");
  $("#drawer").onclick = (e) => { if (e.target.id === "drawer") $("#drawer").classList.remove("on"); };

  // ───────── 选角 ─────────
  function renderRoles() {
    $("#roleGrid").innerHTML = D.roles.map((r) => `
      <button class="role ${r.ready ? "" : "off"}" data-role="${r.id}">
        <img src="assets/poster/${r.id}.jpg" alt="${r.id}" loading="lazy">
        <span class="sin"><span class="seal">${r.tag}</span></span>
        <span class="cap"><b>${r.id}</b><small>${r.ready ? "可入局" : "剧本转录中"}</small></span>
      </button>`).join("");
  }
  $("#roleGrid").addEventListener("click", (e) => {
    const b = e.target.closest("[data-role]");
    if (!b) return;
    const r = D.roles.find((x) => x.id === b.dataset.role);
    if (!r.ready) { b.querySelector("small").textContent = "剧本转录中，敬请期待"; return; }
    $("#cfName").textContent = r.id;
    $("#cfImg").src = `assets/poster/${r.id}.jpg`;
    $("#cfPoem").textContent = r.poem;
    $("#start").dataset.role = r.id;
    show("confirm");
  });

  // ───────── 开局 / 续读 ─────────
  async function enter(fresh, role) {
    if (fresh) st = { role, act: 1, pos: 0, vars: { ...D.vars }, c: {}, log: [], items: [] };
    const txt = await fetch(`story/${encodeURIComponent(st.role)}/${String(st.act).padStart(2, "0")}.txt`).then((r) => r.text());
    blocks = parse(txt);
    for (const b of blocks) if (b.t === "shared" && !shared[b.id])
      shared[b.id] = await fetch(`story/_shared/${b.id}.txt`).then((r) => r.text());
    $("#rdName").textContent = st.role;
    show("reader");
    if (fresh) { book().innerHTML = ""; advance(); }
    else { replay(); advance(false); setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 50); }
  }
  $("#start").onclick = (e) => { clear(); enter(true, e.currentTarget.dataset.role); };
  $("#resume").onclick = () => { st = load(); if (st) enter(false); };
  $("#toCover").onclick = () => { $("#resume").style.display = load() ? "" : "none"; show("cover"); };

  renderRoles();
  if (load()) $("#resume").style.display = "";
})();
