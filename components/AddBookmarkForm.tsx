import BookmarkForm from './BookmarkForm';

interface AddBookmarkFormProps {
  category: string;
  onClose: () => void;
}

export default function AddBookmarkForm({
  category,
  onClose,
}: AddBookmarkFormProps) {
  return <BookmarkForm mode="add" category={category} onClose={onClose} />;
}
