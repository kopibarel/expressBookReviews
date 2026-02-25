curl -X POST http://localhost:5000/customer/login ^
  -H "Content-Type: application/json" ^
  -d "{\"username\":\"john1234\",\"password\":\"Password123\"}"
{
    "message": "Logged in.",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.examplepayload.signature"
}
