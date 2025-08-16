-- Fix OTP long expiry security warning
-- Set OTP expiry to recommended threshold (5 minutes = 300 seconds)

UPDATE auth.config 
SET otp_exp_time = 300
WHERE id = 1;