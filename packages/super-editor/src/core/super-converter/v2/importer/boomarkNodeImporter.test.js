import {SuperConverter} from "../../SuperConverter.js";
import {handleBookmarkNode} from "./bookmarkNodeImporter.js";
import {createNodeListHandlerMock} from "./test-helpers/testUtils.test.js";


describe('BookmarkNodeImporter', () => {
    it("parses only bookmark nodes", () => {
        const names = Object.keys(SuperConverter.allowedElements).filter((name) => name !== 'w:bookmarkStart');
        const nodesOfNodes = names.map((name) => ([{name}]));
        for(const nodes of nodesOfNodes) {
            const result = handleBookmarkNode(nodes, null, null, false);
            expect(result.length).toBe(0);
        }
    })
    it("parses bookmark nodes and w:name attributes", () => {
        const nodes = [{name: 'w:bookmarkStart', attributes: {'w:name': 'bookmarkName'}}];
        const result = handleBookmarkNode(nodes, null, createNodeListHandlerMock(), false);
        expect(result.length).toBe(1);
        expect(result[0].type).toBe('standardNodeHandler');
        expect(result[0].attrs.name).toBe("bookmarkName");
    })
    it("parser relies on handleStandardNode", () => {
        const consoleMock = vi.spyOn(console, 'error').mockImplementation(() => undefined);

        const nodes = [{name: 'w:bookmarkStart', attributes: {'w:name': 'bookmarkName'}}];
        const result = handleBookmarkNode(nodes, null, {handlerEntities: []}, false);
        expect(result.length).toBe(0);
        expect(consoleMock).toHaveBeenCalledOnce();
    })
})