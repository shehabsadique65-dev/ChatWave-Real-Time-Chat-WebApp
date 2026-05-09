-- Paste this entire block into the Supabase SQL Editor and click 'RUN'

-- Create USERS table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    full_name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    passphrase TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create MESSAGES table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username TEXT NOT NULL,
    full_name TEXT NOT NULL,
    message TEXT NOT NULL,
    timestamp BIGINT NOT NULL
);

-- Enable Realtime for messages (Optional, if you want direct Supabase realtime instead of Socket.io, though our backend uses polling/inserting currently and Socket.io broadcasts)
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
