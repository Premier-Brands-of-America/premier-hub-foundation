-- Notifications table
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  message text,
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE INDEX idx_notifications_user_unread ON public.notifications (user_id, is_read) WHERE is_read = false;

-- AI Assistant sessions
CREATE TABLE public.ai_assistant_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_assistant_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON public.ai_assistant_sessions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions"
  ON public.ai_assistant_sessions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON public.ai_assistant_sessions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON public.ai_assistant_sessions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_ai_sessions_updated_at
  BEFORE UPDATE ON public.ai_assistant_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- AI Assistant messages
CREATE TABLE public.ai_assistant_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.ai_assistant_sessions(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_assistant_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own session messages"
  ON public.ai_assistant_messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.ai_assistant_sessions
    WHERE id = ai_assistant_messages.session_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own session messages"
  ON public.ai_assistant_messages FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.ai_assistant_sessions
    WHERE id = ai_assistant_messages.session_id AND user_id = auth.uid()
  ));

CREATE INDEX idx_ai_messages_session ON public.ai_assistant_messages (session_id, created_at);