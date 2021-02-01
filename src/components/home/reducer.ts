import { assoc, concat, isEmpty, mergeAll, pipe, when } from "ramda";
import {
    HomeActionTypes,
    ADD_USER_PROFILES,
    SEARCH_PROJECTS_REQUEST,
    SEARCH_PROJECTS_SUCCESS,
    FETCH_POPULAR_PROJECTS,
    SET_POPULAR_PROJECTS_OFFSET
} from "./types";
import { IProject } from "@comp/projects/types";
import { IProfile } from "@comp/profile/types";

export interface IHomeReducer {
    popularProjects: IProject[];
    popularProjectsOffset: number;
    popularProjectsTotalRecords: number;
    profiles: { [uid: string]: IProfile };
    searchProjectsRequest: boolean;
    searchResult: IProject[];
    searchResultTotalRecords: number;
    searchPaginationOffset: number;
    searchQuery: string;
}

const INITIAL_STATE: IHomeReducer = {
    popularProjects: [],
    popularProjectsOffset: -1,
    popularProjectsTotalRecords: -1,
    profiles: {},
    searchProjectsRequest: false,
    searchResult: [],
    searchResultTotalRecords: -1,
    searchPaginationOffset: -1,
    searchQuery: ""
};

const HomeReducer = (
    state: IHomeReducer = INITIAL_STATE,
    action: HomeActionTypes
): IHomeReducer => {
    switch (action.type) {
        case SEARCH_PROJECTS_REQUEST: {
            return pipe(
                assoc("searchProjectsRequest", !isEmpty(action.query)),
                assoc("searchQuery", action.query),
                assoc(
                    "searchPaginationOffset",
                    isEmpty(action.query) ? -1 : action.offset
                ),
                when(
                    () => isEmpty(action.query),
                    assoc("searchResultTotalRecords", -1)
                )
            )(state);
        }
        case SEARCH_PROJECTS_SUCCESS: {
            return pipe(
                assoc("searchResult", action.result || []),
                assoc("searchProjectsRequest", false),
                assoc("searchResultTotalRecords", action.totalRecords)
            )(state);
        }
        case ADD_USER_PROFILES: {
            return assoc(
                "profiles",
                mergeAll([action.payload, state.profiles]),
                state
            );
        }
        case FETCH_POPULAR_PROJECTS: {
            return pipe(
                assoc(
                    "popularProjects",
                    concat(state.popularProjects, action.payload)
                ),
                assoc("popularProjectsTotalRecords", action.totalRecords)
            )(state);
        }
        case SET_POPULAR_PROJECTS_OFFSET: {
            return assoc("popularProjectsOffset", action.newOffset, state);
        }

        default: {
            return state;
        }
    }
};

export default HomeReducer;
