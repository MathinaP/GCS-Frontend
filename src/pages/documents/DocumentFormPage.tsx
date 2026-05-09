import { type DocumentType } from '../../types';
import DocumentForm from './DocumentForm';

interface Props { type: DocumentType }

export default function DocumentFormPage({ type }: Props) {
  return <DocumentForm type={type} />;
}
