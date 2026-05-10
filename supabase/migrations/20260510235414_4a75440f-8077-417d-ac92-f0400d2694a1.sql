
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'member');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Books
CREATE TABLE public.books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  genre TEXT,
  isbn TEXT UNIQUE,
  description TEXT,
  cover_url TEXT,
  total_copies INTEGER NOT NULL DEFAULT 1,
  available_copies INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

-- Transactions
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  borrow_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_date TIMESTAMPTZ NOT NULL,
  return_date TIMESTAMPTZ,
  renewed_count INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Profiles
CREATE POLICY "Profiles viewable by self or admin" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- user_roles
CREATE POLICY "Users see own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Books
CREATE POLICY "Anyone authenticated can view books" ON public.books
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage books" ON public.books
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Transactions
CREATE POLICY "Members see own transactions; admins see all" ON public.transactions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Members create own transactions" ON public.transactions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Members update own; admins all" ON public.transactions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete transactions" ON public.transactions
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger: auto-create profile and assign member role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed sample books
INSERT INTO public.books (title, author, genre, isbn, description, total_copies, available_copies) VALUES
('The Great Gatsby', 'F. Scott Fitzgerald', 'Classic', '9780743273565', 'A story of the fabulously wealthy Jay Gatsby and his love for the beautiful Daisy Buchanan.', 3, 3),
('1984', 'George Orwell', 'Dystopian', '9780451524935', 'A dystopian social science fiction novel and cautionary tale.', 4, 4),
('To Kill a Mockingbird', 'Harper Lee', 'Fiction', '9780061120084', 'A gripping tale of racial injustice and childhood innocence.', 2, 2),
('Clean Code', 'Robert C. Martin', 'Programming', '9780132350884', 'A handbook of agile software craftsmanship.', 5, 5),
('Sapiens', 'Yuval Noah Harari', 'History', '9780062316097', 'A brief history of humankind.', 3, 3),
('Dune', 'Frank Herbert', 'Sci-Fi', '9780441172719', 'Epic science fiction novel set on the desert planet Arrakis.', 2, 2);
