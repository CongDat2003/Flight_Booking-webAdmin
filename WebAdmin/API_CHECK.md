# Hướng dẫn kiểm tra và sửa lỗi ERR_CONNECTION_REFUSED

## Lỗi: ERR_CONNECTION_REFUSED

Lỗi này xảy ra khi WebAdmin không thể kết nối đến API backend. Có thể do:
1. API chưa chạy
2. API chạy trên port khác
3. URL API không đúng

## Cách kiểm tra và sửa:

### 1. Kiểm tra API có đang chạy không

**Windows (PowerShell):**
```powershell
netstat -ano | findstr :501
```

**Hoặc mở browser và truy cập:**
- Swagger UI: `http://localhost:501/swagger`
- API Test: `http://localhost:501/api/Bookings`

Nếu không có kết quả, API chưa chạy. Chạy API như sau:

```bash
cd API/FlightBooking
dotnet run --launch-profile http
```

### 2. Kiểm tra port API đang chạy

Xem trong file `API/FlightBooking/Properties/launchSettings.json`:
- Profile "http": port **501**
- Profile "https": ports **7264** (HTTPS) và **5091** (HTTP)

### 3. Thay đổi API URL trong WebAdmin

**Cách 1: Tự động (khuyên dùng)**
- File `js/config.js` tự động detect API URL
- Nếu chạy từ cùng server, sẽ tự động dùng đúng URL

**Cách 2: Thủ công qua Console**
1. Mở WebAdmin trong browser
2. Mở Developer Console (F12)
3. Gõ lệnh:
```javascript
setApiUrl('http://localhost:501/api')
// hoặc nếu API chạy trên IP khác:
setApiUrl('http://192.168.10.62:501/api')
```
4. Reload trang

**Cách 3: Sửa file config.js**
Mở `js/config.js` và thay đổi dòng:
```javascript
const API_BASE_URL = 'http://localhost:501/api';
```
Thành URL API của bạn, ví dụ:
```javascript
const API_BASE_URL = 'http://192.168.10.62:501/api';
```

### 4. Kiểm tra CORS

Đảm bảo API có CORS enabled (đã có trong `Program.cs`):
```csharp
builder.Services.AddCors(options => {
    options.AddPolicy("AllowAll", policy => {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});
```

### 5. Test API connection

Mở browser console (F12) và chạy:
```javascript
fetch('http://localhost:501/api/Bookings')
  .then(r => r.json())
  .then(d => console.log('API OK:', d))
  .catch(e => console.error('API Error:', e))
```

## Checklist:

- [ ] API đang chạy trên port 501 (kiểm tra bằng netstat hoặc browser)
- [ ] API_BASE_URL trong config.js đúng với port API đang chạy
- [ ] CORS đã được enable trong Program.cs
- [ ] Browser console không có lỗi CORS
- [ ] Đã test API bằng browser trước (http://localhost:501/swagger)

## Common Issues:

**Issue 1: API chạy trên port khác**
- Giải pháp: Cập nhật `API_BASE_URL` trong `js/config.js`

**Issue 2: API chạy trên máy khác trong mạng**
- Giải pháp: Dùng IP thay vì localhost:
  ```javascript
  const API_BASE_URL = 'http://192.168.10.62:501/api';
  ```

**Issue 3: API chưa start**
- Giải pháp: Chạy `dotnet run` trong thư mục API/FlightBooking

**Issue 4: Firewall chặn kết nối**
- Giải pháp: Kiểm tra Windows Firewall và cho phép port 501






