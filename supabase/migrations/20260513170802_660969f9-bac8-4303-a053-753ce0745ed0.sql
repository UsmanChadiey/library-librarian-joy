
-- Add pdf_path to books
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS pdf_path text;

-- Create private bucket for book PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('book-pdfs', 'book-pdfs', false)
ON CONFLICT (id) DO NOTHING;

-- Admins can fully manage PDFs
CREATE POLICY "Admins manage book pdfs"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'book-pdfs' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'book-pdfs' AND public.has_role(auth.uid(), 'admin'));

-- Members can read a PDF only if they have an active (not returned, not overdue) loan for the book
CREATE POLICY "Borrowers can read book pdf during loan"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'book-pdfs'
  AND EXISTS (
    SELECT 1
    FROM public.transactions t
    JOIN public.books b ON b.id = t.book_id
    WHERE t.user_id = auth.uid()
      AND t.return_date IS NULL
      AND t.due_date >= now()
      AND b.pdf_path = storage.objects.name
  )
);
