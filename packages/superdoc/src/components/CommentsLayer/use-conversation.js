import { ref } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import useSelection from '@/helpers/use-selection';
import useComment from '@/components/CommentsLayer/use-comment';

export default function useConversation(params) {

  const conversationId = params.conversationId || uuidv4();
  const documentId = params.documentId;
  const creatorEmail = params.creatorEmail;
  const creatorName = params.creatorName;
  const comments = ref(params.comments ? params.comments.map((c) => useComment(c)) : []);
  const selection = useSelection(params.selection);
  
  /* Mark done (resolve) conversations */
  const markedDone = ref(params.markedDone || null);
  const markedDoneByEmail = ref(params.markedDoneByEmail || null);
  const markedDoneByName = ref(params.markedDoneByName || null);

  const isFocused = ref(params.isFocused || false);

  /* Mark this conversation as done with UTC date */
  const markDone = (email, name) => {
    markedDone.value = new Date().toISOString();
    markedDoneByEmail.value = email;
    markedDoneByName.value = name;
  }

  /* Add a comment to this conversation */
  const addComment = (comment) => data.comments.value.push(comment);

  /* Get the raw values of this conversation */
  const getValues = () => {
    const values = {
      // Raw
      conversationId,
      documentId,
      creatorEmail,
      creatorName,

      comments: comments.value.map((c) => c.getValues()),
      selection: selection.getValues(),
      markedDone: markedDone.value,
      markedDoneByEmail: markedDoneByEmail.value,
      markedDoneByName: markedDoneByName.value,
      isFocused: isFocused.value,
    }
    return values;
  }

  const exposedData = {
    conversationId,
    documentId,
    creatorEmail,
    creatorName,
    comments,
    selection,
    markedDone,
    markedDoneByEmail,
    markedDoneByName,
    isFocused,
  }
  return {
    ...exposedData,

    // Data that does not need to be exported raw
    // Actions
    addComment,
    getValues,
    markDone,
  };
}