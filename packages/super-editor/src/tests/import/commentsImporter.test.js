import { getTestDataByFileName, loadTestDataForEditorTests, initTestEditor } from '@tests/helpers/helpers.js';
import { importCommentData } from '@converter/v2/importer/documentCommentsImporter.js';
import { CommentMarkName } from '@extensions/comment/comments-constants.js';

describe('basic comment import [basic-comment.docx]', () => {
  const dataName = 'basic-comment.docx';
  let content, docx;
  let comments;

  beforeAll(async () => {
    docx = await getTestDataByFileName(dataName);
    const documentXml = docx['word/document.xml'];
    const doc = documentXml.elements[0];
    const body = doc.elements[0];
    content = body.elements;

    // Import comment data
    comments = importCommentData({ docx });
  });

  it('can import basic comments', async () => {
    expect(comments).toHaveLength(1);

    const comment = comments[0];
    expect(comment.commentId).toHaveLength(36); // UUID is generated at import
    expect(comment.creatorName).toBe('Nick Bernal');
    expect(comment.creatorEmail).toBeUndefined();
    expect(comment.createdTime).toBe(1739389620000);
    expect(comment.initials).toBe('NB');
    expect(comment.paraId).toBe('5C17FA99');
    expect(comment.isDone).toBe(false);
    expect(comment.parentCommentId).toBeUndefined();

    const commentText = comment.textJson;
    expect(commentText.type).toBe('paragraph');

    const textNode = commentText.content
      .flatMap((node) => (node.type === 'run' ? node.content || [] : [node]))
      .find((child) => child.type === 'text');
    expect(textNode).toBeDefined();
    expect(textNode.text).toBe('abcabc');

    const marks = textNode.marks || [];
    const textStyleMark = marks.find((mark) => mark.type === 'textStyle');
    expect(textStyleMark?.attrs.fontSize).toBe('10pt');
  });
});

describe('threaded comment import [threaded-comment.docx]', () => {
  const dataName = 'threaded-comment.docx';
  let content, docx;
  let comments;

  beforeAll(async () => {
    docx = await getTestDataByFileName(dataName);
    const documentXml = docx['word/document.xml'];
    const doc = documentXml.elements[0];
    const body = doc.elements[0];
    content = body.elements;

    // Import comment data
    comments = importCommentData({ docx });
  });

  it('can import threaded comments', async () => {
    expect(comments).toHaveLength(3);
    const parentComment = comments[0];
    expect(parentComment.parentCommentId).toBeUndefined();

    const childComment = comments[1];
    expect(childComment.parentCommentId).toBe(parentComment.commentId);
    expect(childComment.isDone).toBe(false);
  });
});

describe('comment import with resolved comment [basic-resolved-comment.docx]', () => {
  const dataName = 'basic-resolved-comment.docx';
  let content, docx;
  let comments;

  beforeAll(async () => {
    docx = await getTestDataByFileName(dataName);
    const documentXml = docx['word/document.xml'];
    const doc = documentXml.elements[0];
    const body = doc.elements[0];
    content = body.elements;

    // Import comment data
    comments = importCommentData({ docx });
  });

  it('can import threaded comments', async () => {
    expect(comments).toHaveLength(2);

    const notResolved = comments[0];
    const resolvedComment = comments[1];
    expect(notResolved.isDone).toBe(false);
    expect(resolvedComment.isDone).toBe(true);
  });
});

describe('comment import without extended metadata [gdocs-comments-export.docx]', () => {
  const dataName = 'gdocs-comments-export.docx';
  let docx;
  let comments;

  beforeAll(async () => {
    docx = await getTestDataByFileName(dataName);
    comments = importCommentData({ docx });
  });

  it('imports comments even when commentsExtended.xml is missing', async () => {
    expect(comments).toHaveLength(2);

    const firstComment = comments[0];
    expect(firstComment.commentId).toHaveLength(36);
    expect(firstComment.creatorName).toBe('Nick Bernal');
    expect(firstComment.createdTime).toBe(1758674262000);
    expect(firstComment.isDone).toBe(false);

    const secondComment = comments[1];
    expect(secondComment.textJson?.content?.[0]?.text).toBe('comment on text');
  });
});

describe('editor integration with Google Docs comments', () => {
  const filename = 'gdocs-comments-export.docx';
  let docx;
  let media;
  let mediaFiles;
  let fonts;
  let editor;

  beforeAll(async () => {
    ({ docx, media, mediaFiles, fonts } = await loadTestDataForEditorTests(filename));
  });

  afterEach(() => {
    editor?.destroy();
  });

  it('applies comment marks when importing Google Docs comments', () => {
    ({ editor } = initTestEditor({ content: docx, media, mediaFiles, fonts }));

    const importedComments = editor.converter.comments || [];
    expect(importedComments).toHaveLength(2);
    const sortedImportedIds = [...importedComments.map((c) => String(c.importedId))].sort();
    expect(sortedImportedIds).toEqual(['0', '1']);

    let commentMarkCount = 0;
    editor.state.doc.descendants((node) => {
      node.marks?.forEach((mark) => {
        if (mark.type.name === CommentMarkName) commentMarkCount += 1;
      });
    });

    expect(commentMarkCount).toBeGreaterThan(0);
  });
});
